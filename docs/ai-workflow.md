# How this was built with AI

Built with Claude Code using the Bee plugin's `/bee:sdd` (spec-driven development) workflow, started with the assessment PDF as input. I made the product and design calls; agents drafted docs, code and tests; every change was reviewed before it was committed. Workflow state and module boundaries live in [`.claude/`](../.claude/).

## Flow

1. **Requirements.** A discovery agent interviewed me from the assessment brief and wrote the [requirements doc](specs/employee-salary-management-discovery.md). I reviewed it with inline `@bee` comments, which moved aggregate pay insights into v1 and added server-side pagination, planned indexes, SQL-only aggregation, test expectations, incremental commits, ADRs, and the deploy/demo deliverables.
2. **Spec.** A spec agent turned that into [vertical slices with acceptance criteria](specs/employee-salary-management-spec.md). My decisions: Rails 8 auth with one seeded HR account, DB `id` as the employee ID, predefined lists for department/role/country, a fixed 1:1 country→currency map, per-currency aggregates with conversion deferred to v2, add/edit in a modal.
3. **Architecture.** An advisor proposed options; I chose plain Rails MVC with one `Employee.pay_insights` class method over a query-object or service layer ([architecture](architecture.md)).
4. **Slices.** For each slice: a coding agent wrote the code, a separate testing agent wrote tests against it, and a verifier agent checked tests, acceptance criteria, SQL-only rules and module boundaries. Nothing was committed until the verifier passed and I approved it.

Slice 0 (deploy the empty apps first) was my addition, so deployment problems surfaced before any feature work.

## What the review loop caught

- Reports of a deactivated manager could no longer be edited or deactivated (manager validation ran on every save).
- Manager search didn't treat `%`/`_` literally: SQLite ignores backslash escapes without an explicit `ESCAPE` clause.
- Login worked locally but not in production: the `SameSite=Lax` session cookie was dropped cross-site (Vercel → Render). Fixed by proxying `/api` through Vercel ([ADR 0004](adr/0004-proxy-api-through-frontend-origin.md)).
- A `secure` cookie would silently not be set behind Render's TLS proxy without `assume_ssl`.
- Frontend tests that relied on raised timeouts instead of being restructured.
- Seeded salaries using one range for every currency, which made JPY/INR insights meaningless.

## Where I steered

- Tailwind + shadcn/ui for the UI.
- Seed automatically only when the database is empty, so a restart never overwrites real data on a persistent disk. (The live demo runs on Render's free tier, which has no disk, so it reseeds after every sleep.)
- `base_salary` is an annual amount, so monthly- and annually-paid staff are comparable.
- Removed the scaffold health-check page from the UI.
- Kept code comments and this README minimal; rationale lives in the [ADRs](adr/).
