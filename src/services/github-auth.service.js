import { Octokit } from "octokit";
import { env } from "../config/env.js";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";
class GitHubAuthService {
    buildAuthorizationUrl(state) {
        const params = new URLSearchParams({
            client_id: env.githubClientId,
            redirect_uri: env.githubCallbackUrl,
            scope: "read:user user:email repo",
            state,
            allow_signup: "true",
        });
        return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
    }
    async exchangeCodeForToken(code) {
        const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent": "ai-doc-generator-backend",
            },
            body: JSON.stringify({
                client_id: env.githubClientId,
                client_secret: env.githubClientSecret,
                code,
                redirect_uri: env.githubCallbackUrl,
            }),
        });
        if (!response.ok) {
            throw new Error("Failed to exchange GitHub authorization code for access token.");
        }
        const data = (await response.json());
        if (!data.access_token) {
            const errorMessage = data.error_description ?? data.error ?? "GitHub OAuth token exchange failed.";
            throw new Error(errorMessage);
        }
        return {
            accessToken: data.access_token,
        };
    }
    async getAuthenticatedUser(accessToken) {
        const octokit = new Octokit({
            auth: accessToken,
        });
        const { data: userData } = await octokit.request("GET /user");
        const email = await this.getPrimaryEmail(accessToken);
        return {
            id: String(userData.id),
            username: userData.login,
            name: userData.name ?? null,
            avatarUrl: userData.avatar_url ?? null,
            email,
        };
    }
    async getPrimaryEmail(accessToken) {
        try {
            const response = await fetch(GITHUB_EMAILS_URL, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                    "User-Agent": "ai-doc-generator-backend",
                },
            });
            if (!response.ok) {
                return null;
            }
            const emails = (await response.json());
            const primaryEmail = emails.find((entry) => entry.primary && entry.verified)?.email ?? null;
            return primaryEmail ?? emails[0]?.email ?? null;
        }
        catch {
            return null;
        }
    }
}
export const githubAuthService = new GitHubAuthService();
export const githubProfileRequest = async (accessToken) => {
    const response = await fetch(GITHUB_USER_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ai-doc-generator-backend",
        },
    });
    if (!response.ok) {
        throw new Error("Unable to fetch GitHub profile.");
    }
    return response.json();
};
//# sourceMappingURL=github-auth.service.js.map