import type { NextFunction, Request, Response } from "express";

import { sessionService } from "../services/session.service.js";
import { verifySessionId } from "../utils/crypto.js";
import prisma from "../lib/prisma.js";

export async function attachSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const session = await sessionService.getSessionFromRequest(req);

  if (session) {
    req.session = session;
    req.user = session.user;
  }

  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.headers.cookie
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("app_session="))
    ?.slice("app_session=".length);


  if (!sessionId) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      },
    });
    return;
  }

  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      },
    });
    return;
  }
  next();
}
