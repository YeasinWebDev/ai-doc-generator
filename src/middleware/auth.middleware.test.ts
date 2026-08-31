import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

import { attachSession, requireAuth } from "./auth.middleware.js";
import prisma from "../lib/prisma.js";
import { getCookieValue, sessionService } from "../services/session.service.js";
import type { AppSession, GitHubUser } from "../types/auth.types.js";

// The middleware imports the real session service (which pulls in env config,
// the generated Prisma client and the DB adapter) and the real prisma client.
// Both are mocked so these tests exercise the middleware logic in isolation.
jest.mock("../services/session.service.js", () => ({
  sessionService: {
    getSessionFromRequest: jest.fn(),
  },
  getCookieValue: jest.fn(),
}));

jest.mock("../lib/prisma.js", () => ({
  __esModule: true,
  default: {
    session: {
      findUnique: jest.fn(),
    },
  },
}));

const mockGetSessionFromRequest = jest.mocked(sessionService.getSessionFromRequest);
const mockGetCookieValue = jest.mocked(getCookieValue);
const mockSessionFindUnique = jest.mocked(prisma.session.findUnique);

const UNAUTHENTICATED_BODY = {
  success: false,
  error: {
    code: "UNAUTHENTICATED",
    message: "Authentication required.",
  },
};

const USER: GitHubUser = {
  id: "github-user-1",
  username: "octocat",
  name: "Octo Cat",
  email: "octocat@example.com",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231",
};

function buildAppSession(overrides: Partial<AppSession> = {}): AppSession {
  return {
    sessionId: "session-id-1",
    githubAccessToken: "gho_test_token",
    user: USER,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

function buildDbSession(overrides: { id?: string; userId?: string; expiresAt?: Date } = {}) {
  return {
    id: "session-id-1",
    userId: "github-user-1",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(Date.now() - 60_000),
    ...overrides,
  };
}

type MockResponse = {
  status: ReturnType<typeof jest.fn>;
  json: ReturnType<typeof jest.fn>;
};

function createResponse(): MockResponse {
  const res: MockResponse = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function createRequest(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie !== undefined) {
    headers.cookie = cookie;
  }
  return { headers } as unknown as Request;
}

function asExpressRes(res: MockResponse): Response {
  return res as unknown as Response;
}

describe("attachSession", () => {
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    next = jest.fn();
  });

  it("attaches the session and user to the request and calls next", async () => {
    const req = createRequest("app_session=session-id-1");
    const res = createResponse();
    const session = buildAppSession();
    mockGetSessionFromRequest.mockResolvedValue(session);

    await attachSession(req, asExpressRes(res), next as unknown as NextFunction);

    expect(mockGetSessionFromRequest).toHaveBeenCalledTimes(1);
    expect(mockGetSessionFromRequest).toHaveBeenCalledWith(req);
    expect(req.session).toEqual(session);
    expect(req.user).toEqual(session.user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("calls next without attaching anything for an anonymous request (no session)", async () => {
    const req = createRequest();
    const res = createResponse();
    mockGetSessionFromRequest.mockResolvedValue(undefined);

    await attachSession(req, asExpressRes(res), next as unknown as NextFunction);

    expect(mockGetSessionFromRequest).toHaveBeenCalledTimes(1);
    expect(req.session).toBeUndefined();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("propagates session service failures so the promise rejects", async () => {
    const req = createRequest("app_session=session-id-1");
    const res = createResponse();
    mockGetSessionFromRequest.mockRejectedValue(new Error("session lookup failed"));

    await expect(
      attachSession(req, asExpressRes(res), next as unknown as NextFunction),
    ).rejects.toThrow("session lookup failed");

    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireAuth", () => {
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    next = jest.fn();
  });

  it("responds 401 when no cookie header is present", async () => {
    const req = createRequest();
    const res = createResponse();

    await requireAuth(req, asExpressRes(res), next as unknown as NextFunction);

    expect(mockGetCookieValue).toHaveBeenCalledWith(undefined, "app_session");
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(UNAUTHENTICATED_BODY);
    expect(next).not.toHaveBeenCalled();
    expect(mockSessionFindUnique).not.toHaveBeenCalled();
  });

  it("responds 401 when the app_session cookie is missing from the header", async () => {
    const cookieHeader = "other_cookie=value; another_cookie=123";
    const req = createRequest(cookieHeader);
    const res = createResponse();
    mockGetCookieValue.mockReturnValue(undefined);

    await requireAuth(req, asExpressRes(res), next as unknown as NextFunction);

    expect(mockGetCookieValue).toHaveBeenCalledWith(cookieHeader, "app_session");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(UNAUTHENTICATED_BODY);
    expect(next).not.toHaveBeenCalled();
    expect(mockSessionFindUnique).not.toHaveBeenCalled();
  });

  it("responds 401 when the session does not exist in the database", async () => {
    const req = createRequest("app_session=session-id-1");
    const res = createResponse();
    mockGetCookieValue.mockReturnValue("session-id-1");
    mockSessionFindUnique.mockResolvedValue(null);

    await requireAuth(req, asExpressRes(res), next as unknown as NextFunction);

    expect(mockSessionFindUnique).toHaveBeenCalledTimes(1);
    expect(mockSessionFindUnique).toHaveBeenCalledWith({
      where: { id: "session-id-1" },
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(UNAUTHENTICATED_BODY);
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 401 when the session has expired", async () => {
    const req = createRequest("app_session=session-id-1");
    const res = createResponse();
    mockGetCookieValue.mockReturnValue("session-id-1");
    mockSessionFindUnique.mockResolvedValue(buildDbSession({ expiresAt: new Date(Date.now() - 1) }));

    await requireAuth(req, asExpressRes(res), next as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(UNAUTHENTICATED_BODY);
    expect(next).not.toHaveBeenCalled();
  });

  it("treats a session whose expiresAt equals the current time as expired", async () => {
    const frozenNow = 1_700_000_000_000;
    jest.useFakeTimers();
    try {
      jest.setSystemTime(frozenNow);

      const req = createRequest("app_session=session-id-1");
      const res = createResponse();
      mockGetCookieValue.mockReturnValue("session-id-1");
      mockSessionFindUnique.mockResolvedValue(buildDbSession({ expiresAt: new Date(frozenNow) }));

      await requireAuth(req, asExpressRes(res), next as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(UNAUTHENTICATED_BODY);
      expect(next).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("calls next without a response for a valid, unexpired session", async () => {
    const req = createRequest("app_session=session-id-1");
    const res = createResponse();
    mockGetCookieValue.mockReturnValue("session-id-1");
    mockSessionFindUnique.mockResolvedValue(buildDbSession());

    await requireAuth(req, asExpressRes(res), next as unknown as NextFunction);

    expect(mockSessionFindUnique).toHaveBeenCalledWith({
      where: { id: "session-id-1" },
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("propagates database failures so the promise rejects", async () => {
    const req = createRequest("app_session=session-id-1");
    const res = createResponse();
    mockGetCookieValue.mockReturnValue("session-id-1");
    mockSessionFindUnique.mockRejectedValue(new Error("db down"));

    await expect(
      requireAuth(req, asExpressRes(res), next as unknown as NextFunction),
    ).rejects.toThrow("db down");

    expect(next).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});


