# Employee Salary Management System

A web app for ACME's HR Manager to manage and search 10,000 employee salary
records, with basic CRUD and aggregate pay insights. Rails 8 API backend +
React (Vite) frontend, SQLite database.

See `docs/specs/employee-salary-management-spec.md` for the full spec and
`docs/specs/employee-salary-management-discovery.md` for product context.

## Project layout

```
backend/    Rails 8 API-only app (SQLite)
frontend/   React app (Vite)
docs/       Spec, discovery doc, ADRs
```

## Slice 0 status

This slice proves the walking skeleton: both apps run locally, the React app
calls the Rails health-check route and displays the result, and both apps are
deploy-ready.

## Slice 1 status

Real authentication (Rails 8's `bin/rails generate authentication` scaffold,
DB-backed session cookie — not JWT/bearer tokens), a protected-route wrapper
on the frontend, and the seeded 10,000-employee dataset. See
`docs/adr/0001-enum-columns-for-department-role-country.md` and
`docs/adr/0002-session-cookie-authentication.md` for the design decisions
behind the data model and the auth mechanism.

## Running locally

### Prerequisites
- Ruby 3.4.3, Rails 8.1+, SQLite3
- Node 22+, npm 10+

### Backend (Rails API)

```
cd backend
bundle install
bin/rails db:prepare   # creates and migrates storage/development.sqlite3
bin/rails db:seed      # seeds the HR Manager login + 10,000 employees (safe to re-run)
bin/rails server -p 3000
```

Visit `http://localhost:3000/health` — should return
`{"status":"ok","service":"employee-salary-management-api"}`.

#### Reviewer login (seeded HR Manager account)

The seed script creates exactly one login — there is no signup flow:

- **Email**: `hr.manager@acme.test`
- **Password**: `SalaryAdmin!2024`

Re-running `bin/rails db:seed` resets this account's password back to the
value above and truncates/regenerates the 10,000 employee rows (see
`backend/db/seeds.rb` for why truncate-and-reseed was chosen over
`find_or_create_by` at this volume).

#### Password reset emails in development

No real SMTP is configured (out of scope for this build — see spec).
`config.action_mailer.delivery_method = :file` writes every sent email to
`backend/tmp/mails/<recipient-address>` as a plain-text/HTML file — open the
most recent file there to read a password-reset link after requesting a
reset from the frontend.

### Frontend (React + Vite)

```
cd frontend
cp .env.example .env   # sets VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

Visit `http://localhost:5173`:
- `/` — the Slice 0 health-check page (also links to the login page).
- `/login` — HR Manager login (use the reviewer credentials above).
- `/passwords/new` — request a password reset link.
- `/passwords/:token/edit` — set a new password from a reset link.
- `/dashboard` — protected; redirects to `/login` if not authenticated. Full
  employee list/search/filter/CRUD/pay-insights UI arrives in Slices 2–4.

The frontend never hardcodes the API host — it reads `VITE_API_BASE_URL` from
the environment (`frontend/.env` locally, a platform env var in production),
baked in at build time by Vite.

## Deployment

**Target: Render**, chosen because it natively supports a Dockerfile-based
Rails web service (Rails 8's generated `Dockerfile` and `bin/docker-entrypoint`
work as-is, including `db:prepare` on boot), a static-site service for the
Vite build, free-tier persistent disks (needed to keep the SQLite file across
deploys), and a single `render.yaml` blueprint that provisions both services
together. Railway/Fly.io would also work, but Render's Blueprint + Docker +
static-site combination is the least amount of custom config for this stack.

A `render.yaml` blueprint at the repo root defines both services:
- `employee-salary-management-api` — Docker web service built from
  `backend/Dockerfile`, with a persistent disk mounted at `/rails/storage`
  (where the production SQLite databases live).
- `employee-salary-management-web` — static site built from `frontend/`
  (`npm install && npm run build`, publishing `dist/`), with an SPA rewrite
  rule so client-side routing works.

### Exact deploy steps (developer performs this — no cloud credentials available to the coding agent)

1. Push this repo to GitHub (or GitLab).
2. In the Render dashboard: **New > Blueprint**, connect the repo. Render
   detects `render.yaml` at the root and proposes both services.
3. Before the first deploy, set these environment variables in the Render
   dashboard (the blueprint marks them `sync: false` so Render prompts for
   them rather than committing secrets to the repo):
   - On `employee-salary-management-api`:
     - `RAILS_MASTER_KEY` — the contents of `backend/config/master.key`
       (do not commit this file's value anywhere; copy it directly from your
       local `backend/config/master.key`).
     - `FRONTEND_ORIGIN` — the deployed frontend URL (e.g.
       `https://employee-salary-management-web.onrender.com`), used by
       `config/initializers/cors.rb` to allow the frontend's cross-origin
       requests. You'll only know this after the frontend's first deploy —
       set it once and redeploy the API.
   - On `employee-salary-management-web`:
     - `VITE_API_BASE_URL` — the deployed backend URL (e.g.
       `https://employee-salary-management-api.onrender.com`). Vite bakes
       this into the build, so redeploy the frontend after setting/changing it.
4. Click **Apply** to provision and deploy both services.
5. Once both are live, update the env vars in step 3 with each other's real
   URLs (if not already known) and trigger a manual redeploy of each service
   from the Render dashboard so the values take effect.
6. Verify: visit the backend's `/health` route directly, then visit the
   frontend URL and confirm it shows "API health check: ok".
7. Seed the production database once, via the Render Shell on the
   `employee-salary-management-api` service: `bin/rails db:seed`. This is a
   manual one-off step (Render's `docker-entrypoint` only runs
   `db:prepare`/migrations on boot, not `db:seed`) — it creates the reviewer
   HR Manager login and the 10,000 employee records. Safe to re-run.
8. Add the live URLs here once deployed:
   - Backend: `<TODO: paste live Render URL>`
   - Frontend: `<TODO: paste live Render URL>`

### Notes on the SQLite + Docker setup
- The Rails 8 default `Dockerfile` (generated by `rails new --api`) builds a
  production image and runs `bin/docker-entrypoint`, which calls
  `bin/rails db:prepare` on boot — this creates/migrates the SQLite databases
  (`storage/production.sqlite3` and the Solid Cache/Queue/Cable companion
  databases) automatically on first deploy and every subsequent boot.
- The Render disk mounted at `/rails/storage` persists the SQLite files
  across deploys and restarts — without it, the database would reset on
  every deploy (Render's filesystem is otherwise ephemeral).

## Environment variables

| App | Variable | Purpose | Local default |
|---|---|---|---|
| backend | `FRONTEND_ORIGIN` | Allowed CORS origin for the React app | `http://localhost:5173` |
| frontend | `VITE_API_BASE_URL` | Base URL the frontend calls for the API | `http://localhost:3000` |
