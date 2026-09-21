# 0004: Proxy the API through the frontend's origin instead of cross-site cookies

## Context
The frontend deploys to Vercel (`*.vercel.app`) and the backend to Render
(`*.onrender.com`) — two different sites. `POST /session` succeeds and sets
the session cookie, but the following `GET /session` comes back `401`: the
browser never sends the cookie back. Per ADR 0002 the cookie is
`SameSite=Lax`, and a `fetch` from one site to another is cross-site, so
`Lax` withholds the cookie regardless of `credentials: "include"`. This only
worked locally because both apps ran on `localhost` (same site).

## Decision
Make the browser talk to a single origin. `frontend/vercel.json` rewrites
`/api/:path*` to the Render backend as a server-side proxy — Vercel forwards
the request and relays the response, including `Set-Cookie`, back to the
browser as if it came from the Vercel host. The frontend calls `/api/...`
(relative, via `VITE_API_BASE_URL=/api` in production) instead of the Render
URL directly, so the cookie is first-party and `SameSite=Lax` applies as
intended. The alternative — relaxing the cookie to `SameSite=None; Secure`
for true cross-site use — was rejected: it requires third-party cookie
support, which browsers increasingly block by default, and it discards the
CSRF protection ADR 0002 already gets for free from `SameSite=Lax`.

## Consequences
- The frontend has no build-time knowledge of the Render URL; only
  `vercel.json` does. Changing backend hosts means updating the rewrite
  destination, not a frontend env var.
- `FRONTEND_ORIGIN` / CORS on the Rails side is no longer exercised by
  production traffic (same-origin requests don't need CORS) — it's kept
  only for local dev, where the Vite dev server and Rails server run on
  different ports.
- Every proxied request adds one extra network hop (Vercel edge to Render),
  a small latency cost in exchange for not depending on third-party cookie
  support.
