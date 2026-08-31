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

const DEFAULT_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function resolveSessionMaxAgeMs(): number {
  const configured = Number(process.env.SESSION_MAX_AGE);
  // Guard against invalid values such as "0" (previously shipped in .env.example):
  // maxAge: 0 produces "Set-Cookie: Max-Age=0", which makes browsers drop the
  // session cookie immediately, and instantly-expired session rows in the DB.
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_SESSION_MAX_AGE_MS;
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
  sessionMaxAgeMs: resolveSessionMaxAgeMs(),
  cookieSameSite: resolveCookieSameSite(process.env.NODE_ENV === "production"),
  cookieSecure: resolveCookieSecure(process.env.NODE_ENV === "production"),
  openaiApiKey: process.env.OPENROUTER_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
} as const;

export const isProduction = env.nodeEnv === "production";

// Cross-site ("none") cookies rely on third-party cookie support, which Firefox
// (Enhanced Tracking Protection / Total Cookie Protection) and Safari block or
// partition by default. Chrome still allows them today, which makes login look
// like it works — until Firefox users try to sign in (401 on /api/auth/me).
if (isProduction && env.cookieSameSite === "none") {
  console.warn(
    "[auth] COOKIE_SAME_SITE=none in production: Firefox and Safari block or partition " +
      "third-party cookies, so app_session will not be sent for cross-site frontends " +
      "(login works in Chrome but fails in Firefox). Deploy same-site instead: proxy the " +
      "API through Next.js rewrites or use a shared registrable domain, and leave " +
      "COOKIE_SAME_SITE unset so it defaults to lax."
  );
}
