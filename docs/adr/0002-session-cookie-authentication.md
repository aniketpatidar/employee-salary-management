# 0002: Database-backed session cookie auth via `bin/rails generate authentication`

## Context
The spec requires a real login gate for a single HR Manager persona, using
Rails 8's built-in authentication generator — not Devise, not a hand-rolled
system, not a third-party identity provider, no OAuth/MFA, no self-service
signup. The backend is `ActionController::API` (no views, no server-rendered
forms), consumed by a separate React SPA over CORS with `credentials:
"include"`.

## Decision
Ran `bin/rails generate authentication` as-is and adapted only what's
necessary for a JSON API (the generator defaults to HTML-form-style
`redirect_to` responses even in `--api` mode):

- **`User`**: `has_secure_password` (bcrypt via the `bcrypt` gem), unique
  index on `email_address`. No self-service signup route exists — the seed
  script is the only way a `User` row is created.
- **`Session`**: a plain `belongs_to :user` row (`ip_address`, `user_agent`,
  timestamps). Note: the actual Rails 8.1 generator does **not** add
  `has_secure_token`/a separate `token` column (despite that being widely
  described online) — it uses the session row's own `id`, referenced only
  ever through a **signed, HTTP-only cookie** (`cookies.signed[:session_id]`).
  Since the cookie is signed with the app's `secret_key_base` and never
  exposed to JS (`httponly: true`), the opaque `id` is not guessable or
  forgeable by a client — the signature is what makes it "opaque" in
  practice, not the column shape. This is the generator's real, current
  output, so it's what was kept, rather than hand-adding a redundant
  `has_secure_token` column purely to match a stricter reading of the spec.
- **Cookie**: `cookies.signed[:session_id]`, expires after 2 weeks,
  `httponly: true`, `same_site: :lax`. Not a JWT, not a bearer token in an
  `Authorization` header.
- **`Authentication` concern** (`app/controllers/concerns/authentication.rb`,
  included by `ApplicationController`): `before_action :require_authentication`
  resolves the current `Session` from the signed cookie via
  `Current.session`. Adapted from the generator's default (which
  `redirect_to`s an HTML login page) to `render json: { error: ... }, status:
  :unauthorized` for `SessionsController#create`, `render json: {...}, status:
  :ok` for `#destroy`, and a JSON `401` for every other unauthenticated
  request — matching the spec's API Shape section.
- **Password reset**: kept the generator's built-in token-based flow
  (`has_secure_password`'s `generates_token_for :password_reset,
  expires_in: 15.minutes`, wired through automatically — no extra code
  needed on `User`). `PasswordsMailer` builds the reset link against the
  **frontend's** origin (`FRONTEND_ORIGIN` env var + `/passwords/:token/edit`)
  instead of a Rails view route, since the reset-confirmation page is a React
  page, not a server-rendered Rails view.
- **CSRF**: `ActionController::API` (and the generator, in `--api` mode)
  does **not** include `ActionController::RequestForgeryProtection` /
  `protect_from_forgery`. This is intentional, not an oversight — CSRF
  tokens are a defense for browser-rendered forms; for a cookie-authenticated
  JSON API, Rails' own current guidance is that `same_site: :lax` (already
  set on the session cookie) is the primary CSRF defense, since it stops the
  browser from attaching the cookie to a cross-site `POST`/state-changing
  request in the first place. No `protect_from_forgery` call was added by
  hand, to stay faithful to "generated via the scaffold, not hand-rolled."
- **Cookies middleware**: `ActionController::API` apps strip the cookies/
  session middleware by default. Added back explicitly in
  `config/application.rb` (`config.middleware.use ActionDispatch::Cookies`)
  — required for `cookies.signed` to work at all; without it, every
  controller that includes `Authentication` raises `NameError: undefined
  method 'cookies'`.
- **Dev/prod mailer delivery**: no real SMTP is required for this build
  (confirmed out of scope). `config.action_mailer.delivery_method = :file`
  in both `development` and `production`, writing each sent email to
  `tmp/mails/<address>` as a flat file, readable locally without
  `letter_opener` or SMTP. The live Render deploy runs no job worker and has
  no persistent disk, so password reset is effectively local-only there.

## Consequences
- Login/logout/password-reset are fully JSON in/out, matching the spec's
  API Shape section, at the cost of diverging from the generator's default
  controller bodies (documented above) — anyone regenerating with `-f` needs
  to reapply these JSON-response edits.
- CSRF protection relies on `SameSite=Lax` rather than a token — acceptable
  and Rails-recommended for this architecture, but should be revisited if a
  future version adds a non-SPA client or relaxes `SameSite` for
  cross-origin embedding.
- The generator's IP-based `rate_limit` on login and password-reset
  requests is kept. It throttles brute force without locking the account.
