/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "babel-jest",
      {
        configFile: false,
        babelrc: false,
        presets: ["@babel/preset-env", "@babel/preset-typescript"],
      },
    ],
  },
  // The project uses ESM-style relative imports with ".js" extensions
  // (e.g. "../services/session.service.js") which point to ".ts" sources.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  clearMocks: true,
};
