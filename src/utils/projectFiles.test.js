import test from "node:test";
import assert from "node:assert/strict";
import { shouldIncludeFile } from "./projectFiles.js";
test("ignores files inside ignored directories", () => {
    const ignoredDirectories = [
        "node_modules/react/index.js",
        ".git/config",
        ".next/server/app.js",
        "dist/index.js",
        "build/bundle.js",
        "coverage/lcov.info",
    ];
    for (const filePath of ignoredDirectories) {
        assert.equal(shouldIncludeFile(filePath), false, `Expected ${filePath} to be ignored`);
    }
});
test("ignores lock files regardless of location", () => {
    const ignoredLockFiles = [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "src/package-lock.json",
        "frontend/yarn.lock",
        "app/pnpm-lock.yaml",
    ];
    for (const filePath of ignoredLockFiles) {
        assert.equal(shouldIncludeFile(filePath), false, `Expected ${filePath} to be ignored`);
    }
});
test("includes prioritized source and documentation extensions", () => {
    const allowedFiles = [
        "src/index.ts",
        "src/App.tsx",
        "src/server.js",
        "src/components.jsx",
        "package.json",
        "prisma/schema.prisma",
        "README.md",
    ];
    for (const filePath of allowedFiles) {
        assert.equal(shouldIncludeFile(filePath), true, `Expected ${filePath} to be included`);
    }
});
test("excludes unsupported extensions", () => {
    const unsupportedFiles = [
        "image.png",
        "video.mp4",
        "font.woff2",
        "document.pdf",
        "style.css",
    ];
    for (const filePath of unsupportedFiles) {
        assert.equal(shouldIncludeFile(filePath), false, `Expected ${filePath} to be excluded`);
    }
});
test("handles nested paths and absolute paths", () => {
    const nestedPaths = [
        "apps/api/src/index.ts",
        "packages/web/src/components/App.tsx",
        "/Users/alice/project/README.md",
        "/tmp/build/output.js",
        "/workspace/node_modules/left-pad/index.js",
    ];
    assert.equal(shouldIncludeFile(nestedPaths[0]), true);
    assert.equal(shouldIncludeFile(nestedPaths[1]), true);
    assert.equal(shouldIncludeFile(nestedPaths[2]), true);
    assert.equal(shouldIncludeFile(nestedPaths[3]), false);
    assert.equal(shouldIncludeFile(nestedPaths[4]), false);
});
test("handles Windows-style paths", () => {
    const windowsPaths = [
        "C:\\repo\\src\\index.ts",
        "C:\\repo\\node_modules\\react\\index.js",
        "C:\\repo\\dist\\bundle.js",
        "C:\\repo\\prisma\\schema.prisma",
        "C:\\repo\\package-lock.json",
        "C:\\repo\\src\\styles\\theme.css",
    ];
    assert.equal(shouldIncludeFile(windowsPaths[0]), true);
    assert.equal(shouldIncludeFile(windowsPaths[1]), false);
    assert.equal(shouldIncludeFile(windowsPaths[2]), false);
    assert.equal(shouldIncludeFile(windowsPaths[3]), true);
    assert.equal(shouldIncludeFile(windowsPaths[4]), false);
    assert.equal(shouldIncludeFile(windowsPaths[5]), false);
});
//# sourceMappingURL=projectFiles.test.js.map