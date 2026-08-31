import "dotenv/config";

const requiredEnvVars = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_CALLBACK_URL",
  "FRONTEND_URL",
  "SESSION_SECRET",
  "DATABASE_URL",
] as const;

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}. Please configure your .env file.`
  );
}

function resolveCookieSameSite(isProduction: boolean): "lax" | "strict" | "none" {
  const configured = process.env.COOKIE_SAME_SITE;
  if (configured === "lax" || configured === "strict" || configured === "none") {
    return configured;
  }
  // Production must run the frontend and backend on the SAME site (Next.js rewrites
  // or shared registrable domain) so the session cookie is first-party. Browsers
  // block third-party cookies, so "none" is only usable for local development.
  return isProduction ? "lax" : "none";
}

function resolveCookieSecure(isProduction: boolean): boolean {
  const configured = process.env.COOKIE_SECURE;
  if (configured === "true" || configured === "false") {
    return configured === "true";
  }
  return isProduction;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  githubClientId: process.env.GITHUB_CLIENT_ID!,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET!,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL!,
  frontendUrl: process.env.FRONTEND_URL!,
  sessionSecret: process.env.SESSION_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  nodeEnv: process.env.NODE_ENV ?? "development",
  sessionMaxAgeMs: Number(process.env.SESSION_MAX_AGE ?? 1000 * 60 * 60 * 24 * 7),
  cookieSameSite: resolveCookieSameSite(process.env.NODE_ENV === "production"),
  cookieSecure: resolveCookieSecure(process.env.NODE_ENV === "production"),
  openaiApiKey: process.env.OPENROUTER_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
} as const;

export const isProduction = env.nodeEnv === "production";
