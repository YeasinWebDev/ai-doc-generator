import type { Request } from "express";

import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import type { AppSession, GitHubUser } from "../types/auth.types.js";
import { generateSessionId, generateSecureToken } from "../utils/crypto.js";

const oauthStates = new Map<string, number>();

function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | undefined {
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
  secure: env.nodeEnv === "production",
  path: "/",
  maxAge: env.sessionMaxAgeMs,
};

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


  storeOauthState(state: string): void {
    oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  },

  consumeOauthState(state: string | undefined): boolean {
    if (!state) {
      return false;
    }

    const expiresAt = oauthStates.get(state);
    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      oauthStates.delete(state);
      return false;
    }

    oauthStates.delete(state);
    return true;
  },

  getOauthStateFromRequest(req: Request): string | undefined {
    return getCookieValue(req.headers.cookie, "github_oauth_state");
  },

  generateStateCookieValue(): string {
    return generateSecureToken(24);
  },
};
