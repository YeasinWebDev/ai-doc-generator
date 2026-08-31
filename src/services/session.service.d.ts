import type { Request } from "express";
import type { AppSession, GitHubUser } from "../types/auth.types.js";
export declare const cookieOptions: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
};
export declare const sessionService: {
    createSession(user: GitHubUser, githubAccessToken: string): Promise<AppSession>;
    getSession(sessionId: string | undefined): Promise<AppSession | undefined>;
    getSessionFromRequest(req: Request): Promise<AppSession | undefined>;
    deleteSession(sessionId: string | undefined): Promise<void>;
    storeOauthState(state: string): void;
    consumeOauthState(state: string | undefined): boolean;
    getOauthStateFromRequest(req: Request): string | undefined;
    generateStateCookieValue(): string;
};
//# sourceMappingURL=session.service.d.ts.map