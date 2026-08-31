# AI Documentation Generator — Backend

REST API backend that automatically generates documentation for GitHub repositories. Users sign in with GitHub OAuth, pick one of their repositories, and the API analyzes the repo's file structure to produce AI-generated documentation. Generated documents are stored and can be retrieved later.

Built with **TypeScript**, **Express 5**, **Prisma 7 (PostgreSQL)**, and **OpenRouter** (via the OpenAI SDK), designed for deployment on **Vercel**.

## Features

- **GitHub OAuth login** — full OAuth App flow with sessions persisted in PostgreSQL and an httpOnly session cookie.
- **Repository browsing** — list the signed-in user's GitHub repositories with pagination and search.
- **AI documentation generation** — fetches a repo's file tree, filters relevant project files, and sends the structure to an AI model to generate documentation.
- **Document persistence** — generated docs are saved per user/repo (updated in place if regenerated) and retrievable by ID.
- **Session-based auth middleware** — `requireAuth` / `attachSession` protect documentation routes.

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Runtime    | Node.js (ESM), TypeScript, `tsx`                  |
| Framework  | Express 5                                         |
| Database   | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)      |
| Auth       | GitHub OAuth App, DB-backed sessions, httpOnly cookie |
| AI         | OpenAI SDK pointed at **OpenRouter** (`baseURL: https://openrouter.ai/api/v1`) |
| GitHub API | Octokit                                           |
| Deployment | Vercel (`@vercel/node`)                           |

## Getting Started

### Prerequisites

- **Node.js** 20+
- A **PostgreSQL** database (local or hosted — e.g. `npx create-db` for a free hosted Postgres)
- A **GitHub OAuth App** (see [GITHUB_AUTH_FLOW.md](./GITHUB_AUTH_FLOW.md) for the complete flow)
- An **OpenRouter API key**

### Installation

```bash
# 1. Install dependencies (also runs `prisma generate` automatically)
npm install

# 2. Configure environment
cp .env.example .env
# then fill in the values (see table below)

# 3. Apply database migrations
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

The server starts on `http://localhost:5000` (or the `PORT` you set). Health check: `GET /health`.

### Environment Variables

| Variable               | Required | Description                                                                 |
| ---------------------- | -------- | --------------------------------------------------------------------------- |
| `PORT`                 | No       | Server port (default: `5000`)                                               |
| `GITHUB_CLIENT_ID`     | Yes      | OAuth App client ID                                                         |
| `GITHUB_CLIENT_SECRET` | Yes      | OAuth App client secret                                                     |
| `GITHUB_CALLBACK_URL`  | Yes      | OAuth callback URL, e.g. `http://localhost:5000/api/auth/github/callback`   |
| `FRONTEND_URL`         | Yes      | Allowed CORS origin / OAuth redirect target, e.g. `http://localhost:3000`   |
| `SESSION_SECRET`       | Yes      | Secret used for session cookie signing                                      |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                                                |
| `SESSION_MAX_AGE`      | No       | Session lifetime in ms (default: `604800000` = 7 days)                      |
| `NODE_ENV`             | No       | `development` or `production` (affects cookie `secure`/`sameSite` defaults) |
| `OPENROUTER_API_KEY`   | No*      | OpenRouter API key used by the AI documentation service                     |
| `GITHUB_TOKEN`         | No       | Optional server-side GitHub token fallback                                  |
| `COOKIE_SAME_SITE`     | No       | Override cookie `sameSite` (`lax`/`strict`/`none`)                          |
| `COOKIE_SECURE`        | No       | Override cookie `secure` flag (`true`/`false`)                              |

\* Required for documentation generation to work.

> **Production note:** browsers block third-party cookies, so in production the frontend and backend must run on the **same site** (Next.js rewrites or a shared registrable domain) with the default `sameSite=lax` cookie. See `src/config/env.ts`.

## Scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start dev server with `nodemon` + `tsx` (hot reload on `src/**.ts`) |
| `npm start`       | Run the server directly with `tsx`                 |
| `npm run build`   | Compile TypeScript to `dist/`                      |
| `npm test`        | Run tests with the built-in Node test runner       |
| `npx prisma migrate dev` | Create/apply migrations in development      |
| `npx prisma generate`    | Regenerate the Prisma client (auto-run on `npm install`) |

## API Reference

Base URL: `http://localhost:5000`

### Health

```
GET /health
```

Returns `{ "success": true, "message": "AI Documentation Generator API is running" }`.

### Auth — `/api/auth`

| Method | Endpoint                 | Description                                              |
| ------ | ------------------------ | -------------------------------------------------------- |
| `GET`  | `/api/auth/github`       | Start GitHub OAuth login (redirects to GitHub)           |
| `GET`  | `/api/auth/github/callback` | OAuth callback; sets session cookie & redirects to frontend |
| `GET`  | `/api/auth/me`           | Get the currently authenticated user                     |
| `POST` | `/api/auth/logout`       | Destroy the session and clear the cookie                 |

### Documentation — `/api/documentation` *(auth required)*

| Method | Endpoint                    | Description                                                                 |
| ------ | --------------------------- | --------------------------------------------------------------------------- |
| `POST` | `/api/documentation`        | Generate documentation for a repo. **Body:** `{ "url": "https://github.com/owner/repo" }`. Returns the generated markdown and a `documentId`. Re-generating an existing repo URL updates the stored doc. |
| `GET`  | `/api/documentation`        | List the user's GitHub repositories. **Query:** `username`, `page` (default `1`), `perPage` (default `30`), `search` |
| `GET`  | `/api/documentation/user/documents` | List all documents generated by the authenticated user               |
| `GET`  | `/api/documentation/:id`    | Get a single generated document by ID                                       |

All authenticated endpoints rely on the session cookie (`credentials: true`), so calls from a browser frontend must include credentials and respect the CORS `FRONTEND_URL` origin.

## Database Schema

Defined in [`prisma/schema.prisma`](./prisma/schema.prisma):

- **User** — GitHub profile (`githubId`, `username`, `email`, `avatarUrl`) plus the stored `githubAccessToken`.
- **Session** — server-side sessions (`userId` → `User.githubId`, `expiresAt`, cascade delete).
- **AiGeneratedDocuments** — generated documentation per user/repo (`userGithubId`, `repoUrl`, `documentation`), indexed by `repoUrl`.

The Prisma client is generated into `src/generated/prisma` (do not edit by hand).

## Project Structure

```
├── api/
│   └── index.ts             # Vercel serverless entry point (re-exports the app)
├── prisma/
│   ├── schema.prisma        # Database models
│   └── migrations/          # Prisma migrations
├── src/
│   ├── app.ts               # Express app: CORS, JSON, /health, route mounting
│   ├── server.ts            # Local dev entry point (app.listen)
│   ├── config/env.ts        # Env loading + validation + cookie/session resolution
│   ├── controllers/         # Request handlers (auth, documentation)
│   ├── middleware/          # attachSession / requireAuth
│   ├── routes/              # Express routers (auth, documentation)
│   ├── services/            # GitHub, GitHub-auth, session, and AI services
│   ├── lib/                 # Prisma client singleton
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Crypto, GitHub URL parsing, file filtering helpers
├── vercel.json              # Vercel deployment config
├── prisma.config.ts         # Prisma configuration (reads DATABASE_URL from .env)
└── GITHUB_AUTH_FLOW.md      # Detailed GitHub OAuth flow documentation
```

## Deployment (Vercel)

The repo is preconfigured for Vercel via `vercel.json`:

1. Import the repository into Vercel.
2. Set all required environment variables in the Vercel project settings (including `OPENROUTER_API_KEY`).
3. Set `GITHUB_CALLBACK_URL` to the deployed callback, e.g. `https://your-backend.vercel.app/api/auth/github/callback`, and register it as the callback URL on your GitHub OAuth App.
4. Deploy — the build command is `npm run build` and all routes are handled by `api/index.ts`.

> In production, the frontend and backend must share the same site so the session cookie remains first-party (see the production note above). A common pattern is a Next.js rewrite from `/api/:path*` to the backend, as described in [GITHUB_AUTH_FLOW.md](./GITHUB_AUTH_FLOW.md).

## License

ISC


