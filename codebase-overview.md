# Codebase Overview
Generated: Thu Oct 15 11:50:23 AM IST 2026
Root: /home/akshat/Downloads/o-auth/o-auth-platform-v5-final

## 1. Basic Stats
- Total files (excluding common junk): 29263

## 2. Directory Tree (cleaned)
```
.
├── app
│   ├── (admin)
│   │   └── admin
│   │       ├── audit-logs
│   │       ├── clients
│   │       ├── tokens
│   │       ├── users
│   │       └── page.jsx
│   ├── api
│   │   ├── account
│   │   │   └── route.js
│   │   ├── admin
│   │   │   ├── audit-logs
│   │   │   ├── clients
│   │   │   ├── stats
│   │   │   ├── tokens
│   │   │   └── users
│   │   ├── auth
│   │   │   ├── forgot-password
│   │   │   ├── [...nextauth]
│   │   │   ├── reset-password
│   │   │   ├── signup
│   │   │   └── verify-email
│   │   ├── chapters
│   │   │   ├── notes
│   │   │   └── progress
│   │   ├── clients
│   │   │   ├── [id]
│   │   │   └── route.js
│   │   ├── keys
│   │   │   ├── [id]
│   │   │   └── route.js
│   │   ├── oauth
│   │   │   ├── authorize
│   │   │   ├── introspect
│   │   │   ├── keys
│   │   │   ├── revoke
│   │   │   ├── token
│   │   │   └── userinfo
│   │   ├── scopes
│   │   │   └── route.js
│   │   └── tokens
│   │       ├── [id]
│   │       └── route.js
│   ├── (auth)
│   │   ├── forgot-password
│   │   │   └── page.jsx
│   │   ├── reset-password
│   │   │   └── page.jsx
│   │   ├── signin
│   │   │   └── page.jsx
│   │   └── signup
│   │       └── page.jsx
│   ├── (dashboard)
│   │   └── dashboard
│   │       ├── clients
│   │       ├── keys
│   │       ├── learning
│   │       ├── settings
│   │       ├── tokens
│   │       └── page.jsx
│   ├── docs
│   │   ├── errors
│   │   │   └── page.jsx
│   │   └── page.jsx
│   ├── oauth
│   │   └── authorize
│   │       └── page.jsx
│   ├── oauth2-servers
│   │   └── [slug]
│   │       └── page.jsx
│   ├── playground
│   │   ├── callback
│   │   │   └── page.jsx
│   │   └── page.jsx
│   ├── solve
│   │   └── page.jsx
│   ├── globals.css
│   ├── icon.svg
│   ├── layout.jsx
│   ├── opengraph-image.jsx
│   └── page.jsx
├── components
│   ├── admin
│   │   ├── AdminClientsManager.jsx
│   │   ├── AdminShell.jsx
│   │   ├── AdminTokensManager.jsx
│   │   ├── AuditLogsManager.jsx
│   │   └── UsersManager.jsx
│   ├── auth
│   │   ├── AuthCard.jsx
│   │   ├── ForgotPasswordForm.jsx
│   │   ├── ResetPasswordForm.jsx
│   │   ├── SignInForm.jsx
│   │   └── SignUpForm.jsx
│   ├── dashboard
│   │   ├── ClientDetail.jsx
│   │   ├── ClientsManager.jsx
│   │   ├── DashboardShell.jsx
│   │   ├── DeleteAccountForm.jsx
│   │   ├── KeysManager.jsx
│   │   ├── LearningManager.jsx
│   │   ├── TokensManager.jsx
│   │   └── UsageChart.jsx
│   ├── oauth
│   │   └── ConsentForm.jsx
│   ├── playground
│   │   ├── FlowTimeline.jsx
│   │   ├── LiveLogFeed.jsx
│   │   ├── PlaygroundApp.jsx
│   │   └── TokenInspector.jsx
│   ├── ChapterContent.jsx
│   ├── ChapterLayout.jsx
│   ├── ChapterNotes.jsx
│   ├── ChapterRow.jsx
│   ├── ErrorState.jsx
│   ├── ExpiryCountdown.jsx
│   ├── FooterCTA.jsx
│   ├── Header.jsx
│   ├── Hero.jsx
│   ├── Providers.jsx
│   ├── SecretReveal.jsx
│   └── TableOfContents.jsx
├── data
│   └── chapters.js
├── lib
│   ├── apiAuth.js
│   ├── auth.js
│   ├── clientAuth.js
│   ├── jwt.js
│   ├── mailer.js
│   └── prisma.js
├── oauth
│   ├── errors.js
│   └── pkce.js
├── prisma
│   ├── schema.prisma
│   └── seed.js
├── public
├── realtime
│   ├── emitter.js
│   └── socketServer.js
├── scripts
│   ├── ci-generate-test-keys.js
│   ├── generate-keys.js
│   └── purge-tokens.js
├── services
│   ├── adminService.js
│   ├── apiKeyService.js
│   ├── auditService.js
│   ├── chapterService.js
│   ├── clientService.js
│   └── tokenService.js
├── tests
│   ├── frontend
│   │   ├── ConsentForm.test.jsx
│   │   └── SignInForm.test.jsx
│   ├── integration
│   │   ├── adminService.test.js
│   │   ├── authRoutes.test.js
│   │   ├── clientService.test.js
│   │   ├── idor.test.js
│   │   ├── oauth-flow.test.js
│   │   └── tokenService.test.js
│   ├── unit
│   │   ├── pkce.test.js
│   │   └── rateLimit.test.js
│   └── setup.js
├── utils
│   ├── crypto.js
│   ├── curl.js
│   ├── pagination.js
│   ├── pkceBrowser.js
│   ├── rateLimit.js
│   └── validation.js
├── codebase-overview.md
├── docker-compose.yml
├── Dockerfile
├── jsconfig.json
├── middleware.js
├── next.config.js
├── package.json
├── package-lock.json
├── postcss.config.js
├── README.md
├── server.js
├── SUMMARY.md
├── tailwind.config.js
└── vitest.config.js

79 directories, 111 files
```

## 3. File Type Breakdown
     71 js
     63 jsx
      4 json
      3 md
      2 yml
      1 svg
      1 prisma
      1 gitkeep
      1 gitignore
      1 example
      1 env
      1 dockerignore
      1 /Dockerfile
      1 css

## 4. Key Config / Entry Files
### package.json
```
{
  "name": "o-auth-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "cross-env NODE_ENV=production node server.js",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "node prisma/seed.js",
    "db:studio": "prisma studio",
    "keys:generate": "node scripts/generate-keys.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "ci": "npm run lint && npm run test",
    "jobs:purge-tokens": "node scripts/purge-tokens.js"
  },
  "dependencies": {
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.18.0",
    "bcryptjs": "^2.4.3",
    "framer-motion": "^11.3.19",
    "jose": "^5.6.3",
    "lucide-react": "^0.417.0",
    "next": "^14.2.5",
    "next-auth": "^4.24.7",
    "nodemailer": "^7.0.13",
    "ioredis": "^5.4.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "socket.io": "^4.7.5",
    "socket.io-client": "^4.7.5",
    "uuid": "^9.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitest/coverage-v8": "^2.1.9",
    "autoprefixer": "^10.4.19",
    "cross-env": "^7.0.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.5",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.40",
    "prisma": "^5.18.0",
    "tailwindcss": "^3.4.7",
    "vitest": "^2.1.9"
  }
}
```

### README.md
```
# o-auth — Real-Time OAuth 2.0 Platform

A complete, production-shaped OAuth 2.0 authorization server, developer
dashboard, and real-time Playground — built on Next.js App Router
(JavaScript only), Prisma + PostgreSQL, NextAuth, and Socket.io.

Sponsored by **Okhla** (a fictional rebrand — see the note at the bottom).

## What's new in this hardening pass

- PKCE "plain" disabled outright; S256-only, enforced in three places
- `client_secret_basic` support added alongside `client_secret_post`
- Brute-force lockout on login and client secret verification
- Rate limiting extended to the `/oauth/authorize` endpoint
- `client_credentials` grant (machine-to-machine, confidential clients)
- Admin client kill-switch (`disabled`), cross-user token revocation,
  full audit log browser
- Playground: canonical 6-step timeline, server-side event history/replay
  (a socket that joins late or reconnects never misses events), "Copy as
  cURL" on every log entry, JWT header + payload decoding
- Consent screen: scope descriptions, client logo, "Remember this
  decision" (tightly scoped to user + client + exact scope set)
- `error_uri` on every OAuth error, linking to a new in-app error
  reference (`/docs/errors`) and how-to guide (`/docs`)
- Dashboard: expiry countdowns, one-click-copy secrets, better empty
  states, a usage chart driven by real token-issuance data (falls back to
  a clearly-labeled sample series only if that query fails)

## Production-readiness pass (this round)

- **Bootstrap**: `Dockerfile` + `docker-compose.yml` for one-command local
  setup, `.eslintrc.json`, GitHub Actions CI (lint + test against a real
  Postgres service container), fail-fast startup env validation in
  `server.js`
- **Tests**: Vitest — PKCE unit tests, token-service integration tests
  (auth-code single-use, refresh rotation + reuse-triggers-chain-revocation),
  and a full authorization-code + PKCE happy-path integration test
  (`npm test`, wired into CI)
- **Dashboard/admin error handling**: every manager component that fetches
  now shows a visible error + Retry instead of spinning forever on a 500 or
  network failure (`components/ErrorState.jsx`)
- **Pagination**: all four admin list endpoints (`users`, `clients`,
  `tokens`, `audit-logs`) are cursor-paginated (`utils/pagination.js`),
  capped at 100/page, with "Load more" wired up in the UI
- **Password reset**: `/forgot-password` → `/reset-password`, backed by
  the existing `VerificationToken` table; logs the reset link to the
  console when SMTP isn't configured (or outside production) instead of
  requiring email setup for local dev
- **Email verification**: soft-gated (a dashboard banner, nothing
  blocked) — verify link is emailed/logged the same way as password reset
- **Self-service account deletion**: `/dashboard/settings`,
  type-`DELETE`-to-confirm
- **Signup rate limiting**, **last-admin demotion guard** (can't leave the
  system without any admin), **scopes fetched from the `Scope` table**
  instead of a hardcoded array that could drift from it
- **Security**: a real Content-Security-Policy (see `middleware.js`),
  `logoUrl`/`redirect_uri` validated to https-only in production (loopback
  exempted for local dev), Playground socket `join-flow` now requires an
  authenticated session
- Consistent `{ error, message, details? }` envelope on the routes touched
  in this pass — see "Known limitations" below for what's not yet swept

## Follow-up pass

Closed four gaps found after the round above: the CI workflow (was
written but got silently dropped from the delivered zip by an overly
broad exclude pattern — see `SUMMARY.md`), a Redis-backed rate limiter,
a short-TTL cache for the hot-path client lookup, and an exhaustive sweep
of every remaining non-OAuth route's error envelope. Full details in
`SUMMARY.md`.

## Final production hardening pass

- **Password reset now actually invalidates existing sessions** — see
  "Known limitations" below for exactly what this covers and the one
  documented edge case (middleware page-gating).
- **Playground socket `join-flow` binds each flow to whoever joins it
  first**, not just "any signed-in user" — see "Known limitations" for
  the residual (non-exploitable) race window.
- **~72 new/expanded test cases**, heavy on negative and IDOR/cross-user
```

### jsconfig.json
```
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### next.config.js
```
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### .env.example
```
# ── Database ─────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/o_auth_platform?schema=public"

# ── NextAuth (Auth.js) ───────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="replace-with-a-random-32-byte-base64-string"
NEXTAUTH_URL="http://localhost:3000"

# OAuth login providers (optional — email/password works without these)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ── o-auth Authorization Server signing keys (RS256) ────────────────────
# Run `npm run keys:generate` to populate these two automatically.
# Values are PEM strings with real newlines escaped as \n.
OAUTH_PRIVATE_KEY=""
OAUTH_PUBLIC_KEY=""
# Key ID advertised in the JWKS document and JWT header — rotate by
# changing this and re-running keys:generate.
OAUTH_KEY_ID="o-auth-key-1"

# ── Token lifetimes (seconds) ─────────────────────────────────────────────
ACCESS_TOKEN_TTL="900"          # 15 minutes — access tokens are short-lived
REFRESH_TOKEN_TTL="2592000"     # 30 days
AUTHORIZATION_CODE_TTL="120"    # 2 minutes — codes are single-use, short-lived

# ── Rate limiting ─────────────────────────────────────────────────────────
TOKEN_ENDPOINT_RATE_LIMIT="30"        # requests
TOKEN_ENDPOINT_RATE_WINDOW_MS="60000" # per 1 minute, per IP+client
AUTHORIZE_ENDPOINT_RATE_LIMIT="60"        # requests
AUTHORIZE_ENDPOINT_RATE_WINDOW_MS="60000" # per 1 minute, per IP+client
# Brute-force lockout thresholds (client secret auth + login) are fixed in
# code at 5 attempts / 5 minute cooldown — see utils/rateLimit.js.

# ── Realtime ───────────────────────────────────────────────────────────────
SOCKET_PORT="3000"

# ── Email (password reset / verification) ──────────────────────────────────
# Optional in development: if SMTP_HOST is unset (or NODE_ENV !== "production"),
# the reset/verification link is logged to the server console instead of
# emailed, so the flow is still testable with zero email setup.
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="o-auth <no-reply@o-auth.local>"

# ── Redis (optional multi-instance rate limiting) ───────────────────────────
# Unset by default — the rate limiter/lockout falls back to an in-memory
# implementation that works fine for a single Node process (see
# utils/rateLimit.js). Set this only if you're running more than one
# instance and need shared state across them.
REDIS_URL=""

# Optional — TTL (ms) for the in-memory getClientByClientId cache in
# services/clientService.js. Always process-local (not Redis-backed, even
# if REDIS_URL is set above) — see the comment there for why. Defaults to
# 30000 (30s) if unset.
CLIENT_CACHE_TTL_MS=""

# ── Required vs optional, at a glance ───────────────────────────────────────
# Required for the app to boot at all: DATABASE_URL, NEXTAUTH_SECRET,
# NEXTAUTH_URL, OAUTH_PRIVATE_KEY, OAUTH_PUBLIC_KEY (server.js fails fast
# with a clear message if any of these are missing).
# Everything else above (Google/GitHub login, SMTP, Redis) is optional and
# has a working fallback in local dev.
```

### docker-compose.yml
```
# One-command local bootstrap:
#   cp .env.example .env   # fill in values (or leave DB creds as-is for compose)
#   docker compose up --build
#   docker compose exec app npm run db:push
#   docker compose exec app npm run db:seed
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: o_auth_platform
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

  # Optional — only used if REDIS_URL is set. The rate limiter falls back to
  # in-memory automatically when this isn't configured, so `docker compose up`
  # without touching this service still works fine.
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"

  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      DATABASE_URL: "postgresql://postgres:postgres@postgres:5432/o_auth_platform?schema=public"

volumes:
  postgres_data:
```

### Dockerfile
```
# Single-process Node server (custom server.js runs Next + Socket.io on one
# port) — this is NOT a Vercel-serverless deployment. See README "Deployment".
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/realtime ./realtime
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
CMD ["node", "server.js"]
```

## 5. Potential Incomplete / TODO markers
```
```

## 6. All Source Files (path + size)
```
1088	./app/page.jsx
1131	./app/api/admin/tokens/[id]/route.js
1140	./tailwind.config.js
1162	./app/layout.jsx
1180	./app/api/tokens/[id]/route.js
1181	./app/api/chapters/progress/route.js
1190	./realtime/emitter.js
1230	./services/apiKeyService.js
1231	./utils/crypto.js
1276	./vitest.config.js
1302	./scripts/ci-generate-test-keys.js
1353	./scripts/purge-tokens.js
1367	./app/api/account/route.js
1385	./app/api/chapters/notes/route.js
1428	./app/api/keys/route.js
1441	./services/adminService.js
1458	./components/admin/AdminShell.jsx
1478	./components/FooterCTA.jsx
1530	./app/api/tokens/route.js
1588	./package.json
1698	./lib/mailer.js
1716	./oauth/pkce.js
1756	./app/api/auth/verify-email/route.js
1768	./app/api/admin/clients/[id]/route.js
1782	./prisma/seed.js
1808	./app/api/clients/route.js
1827	./app/playground/page.jsx
1830	./components/dashboard/DeleteAccountForm.jsx
1851	./tests/setup.js
1857	./components/dashboard/UsageChart.jsx
1907	./app/opengraph-image.jsx
1915	./components/TableOfContents.jsx
1984	./components/playground/FlowTimeline.jsx
2005	./components/auth/ForgotPasswordForm.jsx
2005	./lib/clientAuth.js
2020	./server.js
2062	./utils/pagination.js
2284	./lib/jwt.js
2305	./app/api/admin/users/route.js
2306	./app/api/clients/[id]/route.js
2308	./components/Hero.jsx
2337	./components/ChapterNotes.jsx
2374	./app/(admin)/admin/page.jsx
2386	./components/dashboard/LearningManager.jsx
2433	./tests/unit/rateLimit.test.js
2475	./tests/unit/pkce.test.js
2567	./app/globals.css
2594	./app/api/auth/reset-password/route.js
2664	./components/admin/AuditLogsManager.jsx
2737	./app/api/oauth/introspect/route.js
2796	./components/playground/LiveLogFeed.jsx
2825	./app/api/auth/signup/route.js
2848	./app/api/oauth/revoke/route.js
2864	./components/auth/SignUpForm.jsx
2898	./tests/integration/adminService.test.js
2925	./middleware.js
2956	./oauth/errors.js
2963	./app/api/auth/forgot-password/route.js
3059	./components/auth/ResetPasswordForm.jsx
3120	./components/admin/AdminTokensManager.jsx
3137	./app/playground/callback/page.jsx
3159	./app/api/oauth/userinfo/route.js
3279	./tests/frontend/SignInForm.test.jsx
3471	./app/(dashboard)/dashboard/page.jsx
3471	./components/ChapterLayout.jsx
3751	./components/auth/SignInForm.jsx
3753	./components/dashboard/DashboardShell.jsx
3773	./tests/frontend/ConsentForm.test.jsx
3909	./components/Header.jsx
4126	./components/admin/UsersManager.jsx
4200	./components/admin/AdminClientsManager.jsx
4467	./utils/validation.js
4497	./components/dashboard/TokensManager.jsx
4532	./components/dashboard/KeysManager.jsx
4654	./components/oauth/ConsentForm.jsx
4700	./components/dashboard/ClientDetail.jsx
4924	./realtime/socketServer.js
5244	./services/clientService.js
5470	./app/docs/errors/page.jsx
5488	./app/api/oauth/authorize/route.js
5944	./components/playground/TokenInspector.jsx
6001	./tests/integration/idor.test.js
6285	./app/docs/page.jsx
6647	./tests/integration/clientService.test.js
6698	./app/api/oauth/token/route.js
6963	./lib/auth.js
7048	./app/oauth/authorize/page.jsx
7088	./tests/integration/oauth-flow.test.js
7583	./utils/rateLimit.js
8441	./tests/integration/authRoutes.test.js
8718	./components/dashboard/ClientsManager.jsx
9915	./components/playground/PlaygroundApp.jsx
10458	./tests/integration/tokenService.test.js
10889	./app/solve/page.jsx
17911	./services/tokenService.js
19714	./codebase-overview.md
25131	./README.md
34706	./SUMMARY.md
45247	./data/chapters.js
329399	./package-lock.json
```
