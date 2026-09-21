# Employee Salary Management System

Web app for ACME's HR Manager to search, manage and analyse salaries for 10,000 employees. Rails 8 API + React (Vite) + SQLite.

- Live: https://employee-salary-management-nine.vercel.app (API: https://employee-salary-management-5xuo.onrender.com)
- Login: `hr.manager@acme.test` / `SalaryAdmin!2024`

## Docs

- Requirements: [`docs/specs/employee-salary-management-discovery.md`](docs/specs/employee-salary-management-discovery.md)
- Spec: [`docs/specs/employee-salary-management-spec.md`](docs/specs/employee-salary-management-spec.md)
- Decisions: [`docs/adr/`](docs/adr/)

## Run locally

Requires Ruby 3.4.3, Node 22+.

```
cd backend
bundle install
bin/rails db:prepare db:seed   # 1 HR Manager + 10,000 employees; re-running reseeds
bin/rails server -p 3000
```

```
cd frontend
cp .env.example .env
npm install
npm run dev                    # http://localhost:5173
```

Password-reset emails are written to `backend/tmp/mails/` (no SMTP).

## Test

```
cd backend && bin/rails test
cd frontend && npm test
```

## Deploy

- **Backend (Render)**: Blueprint from `render.yaml`. Set `RAILS_MASTER_KEY`. SQLite lives on a persistent disk at `/rails/storage`; the first boot seeds an empty DB automatically.
- **Frontend (Vercel)**: Root Directory `frontend`, env `VITE_API_BASE_URL=/api`. `frontend/vercel.json` proxies `/api/*` to Render ([ADR 0004](docs/adr/0004-proxy-api-through-frontend-origin.md)).

| Variable | App | Local | Production |
|---|---|---|---|
| `VITE_API_BASE_URL` | frontend | `http://localhost:3000` | `/api` |
| `FRONTEND_ORIGIN` | backend | `http://localhost:5173` | not needed |
| `RAILS_MASTER_KEY` | backend | `config/master.key` | Render env |
