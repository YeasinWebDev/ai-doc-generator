import type { Request, Response } from "express";

import { env } from "../config/env.js";
import { githubAuthService } from "../services/github-auth.service.js";
import { cookieOptions, getCookieValue, sessionService } from "../services/session.service.js";

const AUTH_ERROR_CODE = "AUTH_ERROR";

const buildErrorResponse = (res: Response, statusCode: number, message: string, code = AUTH_ERROR_CODE): void => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

export const authController = {
  async loginWithGitHub(_req: Request, res: Response): Promise<void> {
    try {
      const state = sessionService.generateStateCookieValue();

      res.cookie("github_oauth_state", state, {
        ...cookieOptions,
        maxAge: 10 * 60 * 1000,
      });

      const authorizationUrl = githubAuthService.buildAuthorizationUrl(state);
      res.redirect(authorizationUrl);
    } catch {
      buildErrorResponse(res, 500, "Unable to start GitHub login.");
    }
  },

  async handleGitHubCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query as { code?: string; state?: string };

      if (!code) {
        buildErrorResponse(res, 400, "Missing GitHub OAuth code.", "INVALID_OAUTH_CODE");
        return;
      }

      if (!state) {
        buildErrorResponse(res, 400, "Missing GitHub OAuth state.", "INVALID_OAUTH_STATE");
        return;
      }

      const cookieState = sessionService.getOauthStateFromRequest(req);
      if (!cookieState || cookieState !== state || !sessionService.consumeOauthState(state)) {
        buildErrorResponse(res, 400, "Invalid or expired OAuth state.", "INVALID_OAUTH_STATE");
        return;
      }

      res.clearCookie("github_oauth_state", {
        ...cookieOptions,
        path: "/",
      });

      const { accessToken } = await githubAuthService.exchangeCodeForToken(code);
      const user = await githubAuthService.getAuthenticatedUser(accessToken);

      const session = await sessionService.createSession(user, accessToken);

      res.cookie("app_session", session.sessionId, {
        ...cookieOptions,
        maxAge: env.sessionMaxAgeMs,
      });

      res.redirect(`${env.frontendUrl}/dashboard`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub authentication failed.";

      if (message.toLowerCase().includes("state") || message.toLowerCase().includes("oauth")) {
        buildErrorResponse(res, 400, message, "OAUTH_ERROR");
        return;
      }

      buildErrorResponse(res, 500, "Unable to complete GitHub login.");
    }
  },

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const session = await sessionService.getSessionFromRequest(req);

    if (!session) {
      buildErrorResponse(res, 401, "Authentication required.", "UNAUTHENTICATED");
      return;
    }

    res.json({
      success: true,
      user: {
        id: session.user.id,
        username: session.user.username,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
        email: session.user.email,
      },
    });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const sessionId = getCookieValue(req.headers.cookie, "app_session");

    if (sessionId) {
      await sessionService.deleteSession(sessionId);
    }

    res.clearCookie("app_session", { ...cookieOptions, path: "/" });
    res.clearCookie("github_oauth_state", { ...cookieOptions, path: "/" });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  },
};
