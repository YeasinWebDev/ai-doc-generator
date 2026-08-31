# GitHub OAuth Authentication Flow Documentation

## Overview
This document explains the complete GitHub OAuth authentication flow in this backend application. The flow follows the standard OAuth 2.0 authorization code grant pattern, ensuring secure user authentication without storing passwords.

---

## Complete Flow Diagram

```
User Browser                    Backend Server                    GitHub
    |                                |                              |
    |-- Click "Login with GitHub" -> |                              |
    |                                |--- POST Request ------------> |
    |                                | (client_id, redirect_uri,    |
    |                                |  scope, state)               |
    |                                |                              |
    |<---- Redirect to GitHub -------|                              |
    |                                |                              |
    |-- User Authenticates & Approves -->|                          |
    |                                |                              |
    |<--- Redirect to Callback ---------|<-- Auth Code + State ----|
    |                                |                              |
    |<------ Handle Callback ---------|                              |
    |                                |--- Exchange Code -----------> |
    |                                | (code, client_id,           |
    |                                |  client_secret)             |
    |                                |                              |
    |                                |<-- Access Token ------------|
    |                                |                              |
    |                                |--- Fetch User Profile -----> |
    |                                |<-- User Data --------------|
    |                                |                              |
    |                                |--- Save/Update DB ---------> |
    |                                | (User + Session)            |
    |                                |                              |
    |<-- Set Session Cookie ---------|                              |
    |                                |                              |
    |-- Redirect to Frontend ------->|                              |
    |                                |                              |
```

---

## Step-by-Step Authentication Flow

### Step 1: User Initiates Login
**User Action:** Clicks "Login with GitHub" button on frontend  
**Route:** `GET /auth/github`  
**File:** [src/routes/auth.routes.ts](src/routes/auth.routes.ts)

### Step 2: Generate OAuth State & Build Authorization URL
**Controller:** [src/controllers/auth.controller.ts](src/controllers/auth.controller.ts) - `loginWithGitHub()`  
**Service:** [src/services/github-auth.service.ts](src/services/github-auth.service.ts) - `buildAuthorizationUrl()`

**What happens:**
1. Generate a random `state` parameter (CSRF protection)
2. Store state in memory (session service)
3. Set `github_oauth_state` cookie (10-minute expiration)
4. Build GitHub authorization URL with:
   - `client_id` - Your GitHub app ID
   - `redirect_uri` - Callback URL (e.g., `http://localhost:3000/auth/github/callback`)
   - `scope` - Permissions requested: `read:user user:email repo`
   - `state` - Random token for security
5. Redirect user to GitHub login page

**Example URL:**
```
https://github.com/login/oauth/authorize?
client_id=YOUR_CLIENT_ID&
redirect_uri=http://localhost:3000/auth/github/callback&
scope=read:user%20user:email%20repo&
state=random_state_token&
allow_signup=true
```

### Step 3: User Authenticates with GitHub
**Action:** User logs into GitHub and approves the requested permissions

### Step 4: GitHub Redirects Back to Callback
**Route:** `GET /auth/github/callback?code=AUTHORIZATION_CODE&state=STATE_TOKEN`  
**File:** [src/routes/auth.routes.ts](src/routes/auth.routes.ts)

### Step 5: Verify State & Exchange Code for Access Token
**Controller:** [src/controllers/auth.controller.ts](src/controllers/auth.controller.ts) - `handleGitHubCallback()`  
**Service:** [src/services/github-auth.service.ts](src/services/github-auth.service.ts) - `exchangeCodeForToken()`

**Validation:**
1. Extract `code` and `state` from query parameters
2. Retrieve stored state from cookie
3. Compare state tokens (must match exactly)
4. Consume state token (prevent replay attacks)
5. Clear `github_oauth_state` cookie

**Token Exchange:**
1. Make POST request to GitHub: `https://github.com/login/oauth/access_token`
2. Send:
   - `client_id` - Your GitHub app ID
   - `client_secret` - Your GitHub app secret (kept secure)
   - `code` - Authorization code from GitHub
   - `redirect_uri` - Must match registered URI
3. Receive `access_token` in response

### Step 6: Fetch User Profile Information
**Service:** [src/services/github-auth.service.ts](src/services/github-auth.service.ts) - `getAuthenticatedUser()`

**What happens:**
1. Use access token to authenticate with GitHub API
2. Fetch user data from `GET /user` endpoint:
   - User ID
   - Username (login)
   - Full name
   - Avatar URL
3. Fetch primary email from `GET /user/emails` endpoint
4. Return `GitHubUser` object

### Step 7: Create/Update User & Session in Database
**Service:** [src/services/session.service.ts](src/services/session.service.ts) - `createSession()`

**Database Operations:**
1. **Upsert User** (create if new, update if exists):
   - `githubId` (primary identifier)
   - `username`
   - `name`
   - `email`
   - `avatarUrl`
   - `githubAccessToken` (stored for future API calls)

2. **Create Session Record**:
   - `sessionId` (random secure token)
   - `userId` (link to user)
   - `expiresAt` (TTL based on env.sessionMaxAgeMs)

3. **Return AppSession Object** containing:
   - Session ID
   - Access token
   - User data
   - Expiration timestamp

### Step 8: Set Session Cookie & Redirect
**Controller:** [src/controllers/auth.controller.ts](src/controllers/auth.controller.ts) - `handleGitHubCallback()`

**Final Actions:**
1. Set `app_session` cookie with session ID
2. Cookie options:
   - `httpOnly: true` - Can't be accessed by JavaScript
   - `sameSite: lax` - CSRF protection
   - `secure: true` (production only) - Only sent over HTTPS
   - `maxAge` - Session expiration time
3. Redirect to frontend URL (user is now logged in!)

### Step 9: Subsequent Requests - Session Retrieval
**Middleware:** [src/middleware/auth.middleware.ts](src/middleware/auth.middleware.ts) - `attachSession()`

**For any authenticated request:**
1. Express middleware extracts `app_session` cookie
2. Look up session in database
3. Validate session hasn't expired
4. Attach `session` and `user` objects to request
5. Proceed to route handler

**Protected Routes:**
Use `requireAuth` middleware to ensure user is authenticated before allowing access.

---

## Key Files & Their Importance

### 1. **[src/services/github-auth.service.ts](src/services/github-auth.service.ts)** ⭐ CORE SERVICE
**Responsibility:** OAuth protocol implementation  
**Key Methods:**
- `buildAuthorizationUrl()` - Generates GitHub login URL
- `exchangeCodeForToken()` - Converts authorization code to access token
- `getAuthenticatedUser()` - Fetches user profile from GitHub API
- `getPrimaryEmail()` - Retrieves verified email address

**Why it matters:** Handles all direct communication with GitHub OAuth endpoints

---

### 2. **[src/controllers/auth.controller.ts](src/controllers/auth.controller.ts)** ⭐ REQUEST HANDLER
**Responsibility:** HTTP request handling and response formatting  
**Key Methods:**
- `loginWithGitHub()` - Initiates login flow
- `handleGitHubCallback()` - Processes callback from GitHub
- `getCurrentUser()` - Returns authenticated user info
- `logout()` - Clears session

**Why it matters:** Acts as the orchestrator, calling services and managing HTTP responses

---

### 3. **[src/routes/auth.routes.ts](src/routes/auth.routes.ts)** 🔀 ROUTING
**Responsibility:** Maps HTTP endpoints to controllers  
**Routes:**
- `GET /auth/github` → Initiate login
- `GET /auth/github/callback` → Handle OAuth callback
- `GET /auth/me` → Get current user
- `POST /auth/logout` → Logout

**Why it matters:** Defines all authentication-related endpoints

---

### 4. **[src/services/session.service.ts](src/services/session.service.ts)** 💾 STATE MANAGEMENT
**Responsibility:** Session lifecycle management  
**Key Methods:**
- `createSession()` - Creates user & session in DB
- `getSession()` - Retrieves session by ID
- `getSessionFromRequest()` - Extracts session from cookies
- `generateStateCookieValue()` - Creates CSRF token
- `storeOauthState()` / `consumeOauthState()` - Manages OAuth state

**Why it matters:** Manages session persistence and CSRF protection

---

### 5. **[src/middleware/auth.middleware.ts](src/middleware/auth.middleware.ts)** 🛡️ PROTECTION
**Responsibility:** Authenticates requests  
**Key Functions:**
- `attachSession()` - Attaches user to all requests (if logged in)
- `requireAuth()` - Middleware to protect routes

**Why it matters:** Ensures only authenticated users access protected routes

---

### 6. **[src/types/auth.types.ts](src/types/auth.types.ts)** 📋 TYPE DEFINITIONS
**Responsibility:** TypeScript interfaces  
**Key Types:**
- `GitHubUser` - User data from GitHub
- `AppSession` - Application session structure
- `AuthApiResponse` - API response format

**Why it matters:** Provides type safety across the auth system

---

### 7. **[prisma/schema.prisma](prisma/schema.prisma)** 🗄️ DATABASE SCHEMA
**Responsibility:** Database structure  
**Key Models:**
- `User` - Stores user profile & GitHub token
- `Session` - Tracks active user sessions

**Why it matters:** Persists user data and sessions

---

### 8. **[src/utils/crypto.ts](src/utils/crypto.ts)** 🔐 SECURITY
**Responsibility:** Cryptographic utilities  
**Functions:**
- `generateSessionId()` - Creates secure session ID
- `generateSecureToken()` - Creates random tokens

**Why it matters:** Ensures cryptographically secure tokens

---

### 9. **[src/config/env.ts](src/config/env.ts)** ⚙️ CONFIGURATION
**Responsibility:** Environment variables  
**Required Variables:**
- `GITHUB_CLIENT_ID` - Your GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth app secret
- `GITHUB_CALLBACK_URL` - OAuth callback URL
- `SESSION_MAX_AGE_MS` - Session duration
- `FRONTEND_URL` - Frontend redirect URL

**Why it matters:** Centralized configuration management

---

## Security Features

### ✅ CSRF Protection
- **State Parameter:** Random token generated per login attempt
- **Verification:** State must match between request and callback
- **One-time Use:** State tokens are consumed after use

### ✅ Secure Token Storage
- **Session ID:** Cryptographically random, not stored in cookie directly
- **Access Token:** Stored encrypted in database
- **HTTP-Only Cookies:** JavaScript can't access session cookies

### ✅ Session Expiration
- **TTL:** Sessions expire after configured duration
- **Cleanup:** Expired sessions are invalid

### ✅ HTTPS Requirement
- **Secure Flag:** Cookies only sent over HTTPS in production
- **Token Exchange:** Uses HTTPS for all API calls

---

## Environment Variables Setup

Create a `.env` file with:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_app_id
GITHUB_CLIENT_SECRET=your_github_app_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Session
SESSION_MAX_AGE_MS=2592000000  # 30 days in milliseconds

# Frontend
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Environment
NODE_ENV=development
```

---

## Testing the Flow Locally

1. **Create GitHub OAuth App:**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create new OAuth App
   - Set Authorization callback URL to `http://localhost:3000/auth/github/callback`

2. **Set Environment Variables**

3. **Start Backend:**
   ```bash
   npm run dev
   ```

4. **Test Endpoints:**
   - Login: `http://localhost:3000/auth/github`
   - Get Current User: `http://localhost:3000/auth/me` (after login)
   - Logout: `POST http://localhost:3000/auth/logout`

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid state parameter" | State mismatch or expired | Check token expiration (10 min) |
| "Missing client secret" | Not configured | Set `GITHUB_CLIENT_SECRET` in .env |
| "Redirect URI mismatch" | URL doesn't match GitHub app settings | Update GitHub OAuth app settings |
| "CORS error" | Frontend/Backend domain mismatch | Set proper `FRONTEND_URL` |
| "Session not found" | Cookie not sent or expired | Check cookie settings & expiration |

---

## Data Flow Summary

```
GitHub OAuth App
       ↓
GitHubAuthService (OAuth protocol)
       ↓
AuthController (HTTP handling)
       ↓
SessionService (Session management)
       ↓
Prisma (Database persistence)
       ↓
Auth Middleware (Request protection)
       ↓
Protected Routes
```

---

## What Happens With the Access Token

After successful authentication, the GitHub access token is:

1. **Stored in Database** - Associated with user record
2. **Included in Session** - Returned to controller
3. **Available for API Calls** - Can be used to make authenticated requests to GitHub API
4. **Example Usage:**
   ```typescript
   const octokit = new Octokit({
     auth: user.githubAccessToken
   });
   // Now make authenticated API calls
   ```

---

## Session Lifecycle

```
User Logs In
     ↓
Session Created (30 days TTL)
     ↓
Session Cookie Set
     ↓
AttachSession Middleware Runs
  ├─ Checks cookie
  ├─ Looks up in database
  ├─ Validates expiration
  └─ Attaches to request
     ↓
User Makes Requests (authenticated)
     ↓
Session Expires → Requires new login
OR
User Logs Out → Session cleared
```

---

## Summary

This GitHub OAuth flow provides:
- ✅ Secure user authentication without storing passwords
- ✅ CSRF protection via state parameters
- ✅ Session-based authentication for subsequent requests
- ✅ Secure token storage and access
- ✅ User profile persistence
- ✅ Easy integration with GitHub API

Each file plays a crucial role in this secure, scalable authentication system!
