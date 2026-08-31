import crypto from "node:crypto";

import type { Request } from "express";

import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import type { AppSession, GitHubUser } from "../types/auth.types.js";
import { generateSessionId, generateSecureToken } from "../utils/crypto.js";

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

export function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1));
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "none" as const,
  secure: true,
  path: "/",
  maxAge: env.sessionMaxAgeMs || 10 * 60 * 1000,
};

// Stateless, HMAC-signed OAuth state. The state token embeds its own expiration
// (token.expiresAt.signature) and is verified with SESSION_SECRET, so the value
// works across serverless instances (an in-memory Map is lost between cold
// starts on Vercel and would randomly break logins).
function signOAuthState(state: string, expiresAt: number): string {
  return crypto.createHmac("sha256", env.sessionSecret).update(`${state}.${expiresAt}`).digest("hex");
}

function buildSignedOAuthState(): string {
  const token = generateSecureToken(24);
  const expiresAt = Date.now() + OAUTH_STATE_MAX_AGE_MS;
  return `${token}.${expiresAt}.${signOAuthState(token, expiresAt)}`;
}

function verifyOAuthState(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const [token, expiresAtRaw, signature] = value.split(".");
  if (!token || !expiresAtRaw || !signature) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const expected = Buffer.from(signOAuthState(token, expiresAt));
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

export const sessionService = {
  async createSession(user: GitHubUser, githubAccessToken: string): Promise<AppSession> {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + env.sessionMaxAgeMs);

    const dbUser = await prisma.user.upsert({
      where: { githubId: user.id },
      update: {
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        githubAccessToken,
      },
      create: {
        githubId: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        githubAccessToken,
      },
    });

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: dbUser.githubId,
        expiresAt,
      },
    });

    return {
      sessionId,
      githubAccessToken,
      user,
      expiresAt: expiresAt.getTime(),
    };
  },

  async getSession(sessionId: string | undefined): Promise<AppSession | undefined> {
    if (!sessionId) {
      return undefined;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return undefined;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: sessionId } });
      return undefined;
    }

    return {
      sessionId: session.id,
      githubAccessToken: session.user.githubAccessToken,
      user: {
        id: session.user.githubId,
        username: session.user.username,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
        email: session.user.email,
      },
      expiresAt: session.expiresAt.getTime(),
    };
  },

  async getSessionFromRequest(req: Request): Promise<AppSession | undefined> {
    const sessionId = getCookieValue(req.headers.cookie, "app_session");
    return this.getSession(sessionId);
  },

  async deleteSession(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return;
    }

    await prisma.session.deleteMany({ where: { id: sessionId } });
  },


  storeOauthState(_state: string): void {
    // Deprecated: OAuth state is now stateless (HMAC-signed) so it survives
    // serverless cold starts. Kept as a no-op for API compatibility.
  },

  consumeOauthState(state: string | undefined): boolean {
    return verifyOAuthState(state);
  },

  getOauthStateFromRequest(req: Request): string | undefined {
    return getCookieValue(req.headers.cookie, "github_oauth_state");
  },

  generateStateCookieValue(): string {
    return buildSignedOAuthState();
  },
};
