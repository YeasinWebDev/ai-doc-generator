import path from "node:path";
const IGNORED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
]);
const IGNORED_LOCK_FILES = new Set([
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
]);
const PRIORITIZED_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".prisma",
    ".md",
]);
export function shouldIncludeFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const segments = normalizedPath.split("/").filter(Boolean);
    if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment))) {
        return false;
    }
    const fileName = segments[segments.length - 1] ?? "";
    if (IGNORED_LOCK_FILES.has(fileName)) {
        return false;
    }
    const extension = path.extname(fileName).toLowerCase();
    return PRIORITIZED_EXTENSIONS.has(extension);
}
//# sourceMappingURL=projectFiles.js.map