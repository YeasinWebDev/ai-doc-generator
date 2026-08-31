import type { GitHubUser } from "../types/auth.types.js";
declare class GitHubAuthService {
    buildAuthorizationUrl(state: string): string;
    exchangeCodeForToken(code: string): Promise<{
        accessToken: string;
    }>;
    getAuthenticatedUser(accessToken: string): Promise<GitHubUser>;
    private getPrimaryEmail;
}
export declare const githubAuthService: GitHubAuthService;
export declare const githubProfileRequest: (accessToken: string) => Promise<any>;
export {};
//# sourceMappingURL=github-auth.service.d.ts.map