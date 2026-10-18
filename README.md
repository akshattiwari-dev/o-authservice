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
  cases specifically — see "Testing" below. Coverage reporting
  (`npm run test:coverage`) added.
- **Minimum-viable frontend test coverage** — `ConsentForm` and
  `SignInForm`, React Testing Library + jsdom. Found and fixed one real
  accessibility bug in the process: `SignInForm`'s labels weren't
  programmatically associated with their inputs (`<label>` had no
  `htmlFor`/`id` pairing) — fixed alongside adding the tests.
- **New "Security notes / design decisions" section** below, written so
  the reasoning behind the OAuth-specific hardening (reuse-detection
  chain revocation, the SHA-256/bcrypt split, PKCE `plain` rejection,
  byte-exact `redirect_uri`) can be recited without re-reading the code.

Full details, including exactly what was and wasn't executable in the
authoring sandbox, are in `SUMMARY.md`'s final section.

## Stack

- Next.js 14 (App Router), plain `.js`/`.jsx`, no TypeScript
- PostgreSQL via Prisma
- NextAuth (Auth.js v4) — Credentials (email/password) + Google + GitHub
- Socket.io for real-time Playground logs (needs a custom Node server —
  see below)
- `jose` for RS256-signed access tokens + JWKS
- `bcryptjs` for password/secret hashing
- `zod` for request validation

## 1. Install & configure

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — your Postgres connection string
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` in dev
- `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` (+ secrets) — optional, social
  login providers are only registered if both env vars for that provider
  are present
- `OAUTH_PRIVATE_KEY` / `OAUTH_PUBLIC_KEY` — generate with:

  ```bash
  npm run keys:generate
  ```

  Paste the two printed lines into `.env`.

## 2. Database

```bash
npm run db:generate   # generate the Prisma client
npm run db:push       # create tables from prisma/schema.prisma
npm run db:seed       # seed default scopes + an admin account
```

The seed script prints the admin login it created (default
`admin@o-auth.local` / `ChangeMe123!` unless you set `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`) — **change that password after your first login.**

Use `npm run db:studio` any time to browse the database visually.

> **Upgrading from an earlier version of this project?** This release adds
> an `OAuthClient.disabled` column (the admin kill-switch). Run
> `npm run db:push` again after pulling — it's additive, existing data is
> untouched.

## 3. Run it

```bash
npm run dev
```

This runs `node server.js`, **not** `next dev` — Socket.io needs a
persistent HTTP server to attach to, so `server.js` wraps Next.js's request
handler and Socket.io on the same port. `npm run build && npm start` works
the same way for production.

Open `http://localhost:3000`.

## Architecture

```
app/
  oauth/authorize/            Consent screen (server-validated, real page)
  playground/                  Interactive live Playground
  playground/callback/         Popup callback that exchanges the code
  docs/, docs/errors/           In-app documentation + full error reference
  (auth)/signin, /signup        Auth pages
  (dashboard)/dashboard/...     Developer dashboard (clients, tokens, keys, learning)
  (admin)/admin/...             Admin panel (users, clients, tokens, audit logs)
  api/
    auth/[...nextauth]           NextAuth
    auth/signup                  Email/password registration
    oauth/authorize               POST — finalize consent, issue code
    oauth/token                    POST — authorization_code, refresh_token,
                                     and client_credentials grants
    oauth/revoke                    POST — RFC 7009
    oauth/introspect                POST — RFC 7662
    oauth/userinfo                   GET — profile via access token
    oauth/keys                        GET — JWKS
    clients, clients/[id], clients/[id]/secret   OAuth client CRUD
    tokens, tokens/[id]           User's own token list + self-revoke
    admin/clients, admin/clients/[id]   Admin: list clients, enable/disable
    admin/tokens, admin/tokens/[id]     Admin: list/revoke any token
    admin/audit-logs                     Admin: full audit log
    keys, keys/[id]                 Developer API keys
    chapters/progress, chapters/notes   Learning system
    admin/users, admin/stats          Admin-only

lib/            prisma client, NextAuth config, JWT/JWKS, API auth helper
oauth/          PKCE verification, RFC 6749 error shapes
services/       business logic (clients, tokens, chapters, API keys, audit)
realtime/       Socket.io server + flow-event emitter
utils/          crypto, zod schemas, rate limiter, browser-side PKCE
components/     UI, grouped by area (oauth/, dashboard/, admin/, playground/, auth/)
prisma/         schema.prisma, seed.js
server.js       custom Node entry point (Next.js + Socket.io on one port)
scripts/        one-time RSA keypair generator
```

## How the OAuth server works

- **Authorization Code + PKCE** — `/oauth/authorize` is a real server
  component that re-validates `client_id`, exact `redirect_uri` match, and
  requested scopes against the database before ever showing a consent
  screen. The consent decision posts to `/api/oauth/token`'s sibling,
  `/api/oauth/authorize`, which re-validates everything again server-side
  (the page's rendering is UX, not a trust boundary) and issues a
  single-use, short-lived authorization code — stored only as a SHA-256
  hash.
- **Token issuance** — access tokens are RS256 JWTs signed with `jose`,
  containing a `jti` that's also stored in Postgres so revocation works
  even though the JWT itself is stateless/self-verifying. Refresh tokens
  are opaque random strings, stored only as a hash.
- **Refresh rotation** — every refresh grant revokes the presented token
  and issues a new one, linked via `rotatedToId`. Reuse of an
  already-rotated or revoked refresh token revokes the entire chain — a
  standard signal that a token was stolen and reused.
- **Public vs. confidential clients** — public clients (SPA/native/CLI)
  never get a client secret and are required to use PKCE with S256; this
  is enforced at both the authorize step and the token exchange.
- **Errors** — every OAuth endpoint returns RFC 6749/7009/7662-shaped
  errors (`{ error, error_description }` with the correct HTTP status).

## The Playground (real-time)

The Playground is a genuine client of the platform's own OAuth server, not
a simulation:

1. It generates a `flowId`, connects to Socket.io, and joins a room named
   after that flow.
2. "Start authorization flow" generates a fresh PKCE pair and `state`
   entirely in the browser (Web Crypto), stashes them in `localStorage`
   keyed by `state`, and opens `/oauth/authorize` **in a popup** — so the
   main tab's socket connection stays alive to keep streaming logs.
3. The popup shows the real consent screen. Approving it hits
   `/api/oauth/authorize`, which emits a `flow-event` (visible live in the
   main tab) and redirects the popup to `/playground/callback`.
4. The callback page reads the stashed PKCE verifier, calls
   `/api/oauth/token` (emitting more live events), and `postMessage`s the
   resulting tokens back to the opener before closing itself.
5. The main tab decodes and displays the access token's claims, and lets
   you exercise refresh, introspection, and revocation live against the
   real endpoints — every call streams into the same log.

## Testing

```bash
npm test              # runs once (vitest run)
npm run test:watch
npm run test:coverage # vitest run --coverage — text + html + lcov report
npm run lint          # next lint
npm run ci            # lint + test, same as CI
```

The unit tests (`tests/unit/*.test.js`) and the frontend component tests
(`tests/frontend/*.test.jsx`, React Testing Library + jsdom) need nothing
but Node. The integration tests (`tests/integration/*.test.js`) need a
reachable Postgres at `DATABASE_URL` — point it at a scratch database
(not your dev DB; the tests create and delete real rows) before running
them locally. CI provisions this automatically via a Postgres service
container — see `.github/workflows/ci.yml`.

**~72 test cases total** (12 unit, 9 frontend component, 51 integration —
`clientService`, `tokenService`, `adminService`, the OAuth authorize→
token→introspect flow, auth routes, and a dedicated
`tests/integration/idor.test.js` covering cross-user/IDOR access on
clients, tokens, and API keys by name). Coverage is heaviest on the
security-critical modules (`oauth/`, `services/tokenService.js`,
`services/clientService.js`, `lib/auth.js`'s session-invalidation path) —
run `npm run test:coverage` for the current numbers; `coverage/index.html`
has the full breakdown.

> If you're running the test suite somewhere without internet access to
> `binaries.prisma.sh`, `npx prisma generate` will fail to download its
> query-engine binary. That's an environment/network issue, not a code
> issue — it works normally in CI and on a machine with regular internet
> access.

## Quickest way to run this locally (Docker)

```bash
cp .env.example .env      # fill in NEXTAUTH_SECRET, OAUTH_PRIVATE_KEY/PUBLIC_KEY
                           # (npm run keys:generate prints the two key lines)
docker compose up --build
docker compose exec app npm run db:push
docker compose exec app npm run db:seed
```

Open `http://localhost:3000`. That's the whole bootstrap — no local
Postgres install needed, `docker-compose.yml` runs one for you.

## Demo flow (what to actually click through)

1. Sign up at `/signup` (or use the seeded admin — see step 2 of
   "Database" above). Check your terminal for the verification link
   (SMTP isn't configured by default) and the forgot-password link if you
   test that too.
2. `/dashboard/clients` → register a client. Pick "Public client" to try
   PKCE without a secret, or leave it confidential to get a `client_secret`
   (shown once).
3. `/playground` → pick that client, run the full Authorization Code +
   PKCE flow live, then exercise refresh / introspect / revoke against the
   real endpoints. Every step streams into the live log.
4. `/dashboard/tokens` and `/dashboard/keys` → inspect and revoke what you
   just issued.
5. If your seeded/promoted user is an admin: `/admin` → users, clients,
   tokens, audit logs, all paginated.

## Deployment

This is **not** a Vercel-serverless deployment — `server.js` is a custom
long-running Node process (Next.js + Socket.io sharing one HTTP server),
which serverless platforms don't support running as-is. Deploy it to a
regular Node host (Railway, Render, Fly.io, a VM, etc.) or via the
`Dockerfile` in this repo, with `npm run build && npm start` (or
`docker compose` in production mode) as the process.

If you ever run more than one instance behind a load balancer, the
Playground's live log needs sticky sessions (Socket.io's default) or a
shared adapter (Pusher, Ably, or `socket.io-redis`) — a single instance
needs neither.

## Known limitations

- **Rate limiting and lockout are Redis-backed when `REDIS_URL` is set,
  in-memory otherwise.** `utils/rateLimit.js` uses a process-local `Map`
  by default — fine for the single process `server.js` runs, but not
  shared across replicas. Set `REDIS_URL` (the optional `redis` service
  in `docker-compose.yml`) to share state across instances; if Redis is
  configured but unreachable at request time, it fails soft back to the
  in-memory path for that call rather than 500ing the request (logged
  once, not per-request, to avoid log spam). One real trade-off: the
  Redis path uses `INCR` + `PEXPIRE`-on-first-hit rather than a Lua
  script, so under a very tight race two requests can each see count===1
  and both set the expiry — worst case the window runs a few ms longer
  than configured, which is harmless for a rate limiter.
- **Password reset invalidates existing sessions as of this pass.**
  Sessions use NextAuth's `"jwt"` strategy (no server-side session row to
  delete directly), so this works via a `passwordChangedAt` watermark:
  it's embedded in the JWT at sign-in, and every `jwt()` callback
  invocation re-reads the current value from the DB and rejects the token
  if it predates a reset. Proven by a dedicated test in
  `tests/integration/authRoutes.test.js`. One caveat worth stating
  precisely: `middleware.js`'s route gating uses NextAuth's `getToken()`,
  which decodes the JWT directly without re-running the `jwt()` callback
  (an Edge-runtime constraint — Prisma isn't Edge-compatible, so the
  watermark check can't run there). A revoked session can therefore still
  pass the middleware's page-level gate, but every actual data-fetching
  API call from that page goes through `requireSession()`/
  `getServerSession()`, which does re-run `jwt()` and will reject it —
  so no data is ever served to a revoked session, it just isn't
  force-logged-out at the page-load boundary specifically.
- **No expired-token cleanup job runs automatically.** `npm run jobs:purge-tokens`
  deletes old revoked/expired rows on demand — wire it to a cron/scheduled
  task if your token volume warrants it.
- **The non-admin token list (`/dashboard/tokens`) is a flat `take: 50`**,
  not cursor-paginated like the admin lists — reasonable for one user's
  own tokens, but see the TODO in `app/api/tokens/route.js` if that
  assumption stops holding.
- The `{ error, message, details? }` envelope is now consistent across
  every non-OAuth JSON route (swept in the follow-up pass — see
  `SUMMARY.md`). `app/api/oauth/*` routes intentionally keep RFC
  6749/7009/7662-shaped error bodies instead — that's correct, not an
  oversight.
- **Playground socket `join-flow` binds a flowId to whichever
  authenticated user joins it first**, but the flowId itself is generated
  client-side before any server call exists to "create" it as a resource
  — so there's a brief window before the first join where no owner is
  bound yet. Closing this fully needs the flowId to be minted server-side
  instead. See the comment in `realtime/socketServer.js` for the exact
  race and why it isn't practically exploitable (guessing a 122-bit UUID
  inside a millisecond window).

## Security notes / design decisions

These are written so a candidate can recite the reasoning cold in an
interview, not just point at the code that does it — see also
`SUMMARY.md`'s "Final production hardening pass" section.

**Refresh-token reuse detection → chain revocation.** Every successful
refresh grant does three things atomically: revoke the presented token,
mint a new access/refresh pair, and link the new refresh token to the old
one via `rotatedToId`. That produces a chain:

```
T0 (issued at login) --rotate--> T1 --rotate--> T2 --rotate--> T3 (currently valid)
    revoked=true         revoked=true    revoked=true    revoked=false
```

If anyone ever presents an already-revoked token from the middle of that
chain (say, T1 again), that's the standard signal a token was stolen: the
legitimate client rotated past it, so the only way T1 could reappear is
if an attacker captured it earlier and is now racing to use it. The
server responds by walking the `rotatedToId` chain forward from T1 and
revoking every token in it, including the currently-valid T3 — logging
out the legitimate session too, which is the correct trade-off (a false
positive costs one re-login; a false negative leaves a stolen token
live). The revoke-then-check-then-mint sequence is itself a single atomic
`updateMany({ where: { revoked: false, ... } })` compare-and-swap, not a
`findUnique` followed by a separate `update` — that closes a real race
where two concurrent requests presenting the same valid refresh token
could otherwise both pass a "not yet revoked" check before either write
landed (see `SUMMARY.md`, "third pass" section, for the bug this fixed).

**SHA-256 for opaque tokens, bcrypt for passwords — not interchangeable.**
A password is low-entropy and human-chosen, so it must go through a slow,
salted, adaptive hash (bcrypt) specifically to make brute-forcing
expensive even after a DB leak. A refresh token or API key is a 256-bit
cryptographically random string with no human-guessable structure at
all — bcrypt's slowness buys nothing there (there's no dictionary to
defend against) and would just make every authenticated request slower
for no security benefit. A fast, deterministic hash (SHA-256) is the
right primitive precisely because the *input* is already high-entropy.

**PKCE `"plain"` is rejected outright, not merely discouraged.** RFC 7636
permits `plain` as a fallback, but under `plain` the `code_challenge` and
the secret `code_verifier` are literally the same string — so anything
that can intercept the authorization request (a malicious app on the same
device registering the same custom URI scheme, for instance) already has
everything it needs to redeem the code itself. `S256` breaks that: the
challenge sent up front is a hash, and only the real client holds the
verifier that produces it. `oauth/pkce.js`'s `isAllowedChallengeMethod`
and `verifyPkce` both hard-reject anything other than `S256`.

**`redirect_uri` requires an exact, byte-for-byte match.** RFC 6749
§3.1.2.3 requires this, and it's not pedantry: if the server did prefix
matching, trailing-slash normalization, or subdomain-level matching, an
attacker who controls *any* path under an allowed prefix (an open
redirect elsewhere on the same host, a takeover of an unused subdomain)
could register that as their own "matching" redirect target and receive
authorization codes meant for the real client. A plain JS `!==` on the
full string, checked both when rendering the consent screen and again at
code redemption, has none of those failure modes.


  enforced at the authorize page, the authorize API route, and again at
  token redemption — three independent checks, not one.
- **Both standard client authentication methods are supported** —
  `client_secret_basic` (HTTP Basic header) and `client_secret_post` (body
  params) — via `lib/clientAuth.js`, used consistently by the token,
  introspect, and revoke endpoints. Sending credentials both ways at once
  is rejected rather than silently preferring one.
- **Brute-force lockout** on both login and OAuth client secret
  verification: 5 failed attempts locks that email/client out for 5
  minutes, independent of the general rate limiter
  (`recordFailure`/`isLockedOut` in `utils/rateLimit.js`).
- The token endpoint **and** the authorize endpoint are rate-limited per
  `IP:client_id` (`utils/rateLimit.js`). **This limiter (and the lockout
  tracker) are in-memory and process-local** — fine for the single Node
  process `server.js` runs, but swap them for Redis-backed equivalents
  (e.g. `@upstash/ratelimit`) before running multiple instances behind a
  load balancer.
- `middleware.js` sets standard security headers on every response
  (`X-Frame-Options`, `X-Content-Type-Options`, a `Strict-Transport-Security`
  in production, and a `Content-Security-Policy` — see the comment there
  for why `img-src` has to stay broad: developer-supplied client
  `logoUrl`s) and gates `/dashboard/*` and `/admin/*` on session + role.
- The Playground's Socket.io `join-flow` requires an authenticated
  session on the socket handshake — see "Known limitations" for the
  residual gap (any signed-in user, not specifically the flow's owner).
- Redirect URIs require an **exact, byte-for-byte** match — no prefix, no
  trailing-slash normalization, no wildcard matching — checked both when
  rendering the consent screen and again at code redemption.
- **Refresh token rotation with reuse detection**: every refresh grant
  revokes the presented token and issues a new one, linked in a chain. If
  a token that's already been rotated (or revoked) is ever presented
  again, the entire chain is revoked immediately — the standard signal
  that a token was stolen and both the legitimate client and an attacker
  are now racing to use it.
- **Admin kill-switch**: a disabled client (`OAuthClient.disabled`) is
  rejected at every stage — authorize, token exchange, and refresh — not
  just hidden from the dashboard.
- Every OAuth error response includes an `error_uri` pointing at
  `/docs/errors#<code>`, per RFC 6749 §5.2, so a developer debugging an
  integration gets a direct explanation rather than just a code.

## On the "o-auth" / "Okhla" branding

This project is a learning/demo platform built on top of an earlier
frontend clone of oauth.com that was deliberately rebranded (see the
in-app footer/header) so it's safe to run and share standalone, without
reusing a real company's name or trademark.
