import "dotenv/config";
const requiredEnvVars = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GITHUB_CALLBACK_URL",
    "FRONTEND_URL",
    "SESSION_SECRET",
    "DATABASE_URL",
];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(", ")}. Please configure your .env file.`);
}
export const env = {
    port: Number(process.env.PORT ?? 5000),
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    githubCallbackUrl: process.env.GITHUB_CALLBACK_URL,
    frontendUrl: process.env.FRONTEND_URL,
    sessionSecret: process.env.SESSION_SECRET,
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV ?? "development",
    sessionMaxAgeMs: Number(process.env.SESSION_MAX_AGE ?? 1000 * 60 * 60 * 24 * 7),
    openaiApiKey: process.env.OPENROUTER_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
};
export const isProduction = env.nodeEnv === "production";
//# sourceMappingURL=env.js.map