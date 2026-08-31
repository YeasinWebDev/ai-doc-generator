export type GitHubUser = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    email: string | null;
};
export type AppSession = {
    sessionId: string;
    githubAccessToken: string;
    user: GitHubUser;
    expiresAt: number;
};
export type AuthApiResponse = {
    success: true;
    data: Record<string, unknown>;
    [key: string]: unknown;
} | {
    success: false;
    error: {
        code: string;
        message: string;
    };
};
declare global {
    namespace Express {
        interface Request {
            user?: GitHubUser;
            session?: AppSession;
        }
    }
}
export {};
//# sourceMappingURL=auth.types.d.ts.map