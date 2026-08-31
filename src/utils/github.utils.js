export function parseGithubUrl(url) {
    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/;
    const match = url.match(regex);
    if (!match) {
        throw new Error("Invalid GitHub URL");
    }
    const [, username, repo, branch] = match;
    return { username, repo, branch };
}
//# sourceMappingURL=github.utils.js.map