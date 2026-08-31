import { Octokit } from "octokit";
import { env } from "../config/env.js";
const getOctokit = () => {
    if (!env.githubToken) {
        throw new Error("GitHub token is missing. Set GITHUB_TOKEN in your .env file.");
    }
    return new Octokit({
        auth: env.githubToken,
    });
};
export const getUserInfo = async (username) => {
    try {
        const octokit = getOctokit();
        const { data } = await octokit.rest.users.getByUsername({ username });
        return data;
    }
    catch (error) {
        console.error("Error fetching user info:", error);
        throw error;
    }
};
export const getRepositoryInfo = async (username, repo) => {
    try {
        const octokit = getOctokit();
        const { data } = await octokit.rest.repos.get({
            owner: username,
            repo,
        });
        return data;
    }
    catch (error) {
        console.error("Error fetching repository info:", error);
        throw error;
    }
};
export const getUserRepositories = async (username, search = "", page = 1, perPage = 30) => {
    try {
        const octokit = getOctokit();
        const { data } = await octokit.rest.search.repos({
            q: `user:${username} ${search}`,
            per_page: perPage,
            page: page,
        });
        return data;
    }
    catch (error) {
        console.error("Error fetching user repositories:", error);
        throw error;
    }
};
export const getRepositoryTree = async (username, repo, branch) => {
    try {
        const octokit = getOctokit();
        let treeSha = branch;
        if (!treeSha) {
            const { data: repoData } = await octokit.rest.repos.get({
                owner: username,
                repo,
            });
            treeSha = repoData.default_branch;
        }
        const { data } = await octokit.rest.git.getTree({
            owner: username,
            repo,
            tree_sha: treeSha,
            recursive: "1",
        });
        return data;
    }
    catch (error) {
        console.error("Error fetching repository tree:", error);
        throw error;
    }
};
//# sourceMappingURL=github.service.js.map