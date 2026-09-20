# Discovery: Employee Salary Management Software (ACME)

## Why
ACME's HR team currently manages salary data for 10,000 employees across multiple countries using spreadsheets. This is tedious, error-prone, and makes it hard for HR to answer basic questions about how the org pays its people. The goal is to replace the spreadsheet workflow with web-based software purpose-built for managing and searching this data.

## Who
The HR Manager at ACME — a single persona responsible for maintaining accurate salary records across departments, roles, and countries, and looking up/filtering that data on demand. No other roles or permission tiers are in scope.

## Success Criteria
- HR Manager can find any employee's salary record in seconds instead of digging through spreadsheets.
- HR Manager can filter the workforce by department, country, role, or employment type to answer ad-hoc questions ("who works in Germany?", "what do our contractors in Sales earn?").
- HR Manager can see aggregate pay insights (e.g. average/median salary by department, country, or role) to answer "how does the org pay people?" at a glance, not just record-by-record.
- Employee salary data (10,000 records) lives in one authoritative, always-current system instead of scattered spreadsheet files.
- Working software is **deployed live** (not just running locally), a **video demo** exists showing it in use, and the **repo link** is shareable — all three are deliverables, not just the code.

<!-- -------- bee-comment -------- -->
> **@developer**: A deployed app, a video demo, and a repo link should all be part of success criteria.
> **@bee**: Added a success criterion covering deployment, demo video, and repo link as explicit deliverables (matches the assessment brief's Readiness/Submission requirements).
> - [ ] mark as resolved
<!-- -------- /bee-comment -------->

## Problem Statement
ACME's HR team manages 10,000 employees' salary data across multiple countries entirely in Excel. This makes routine tasks — finding a record, checking who's in a given department or country, updating a salary — slow and error-prone, and there's no reliable way to answer questions about how the organization pays its people. ACME needs a simple, dedicated tool for maintaining and searching this data.

## Hypotheses
- H1: HR's core need is fast, reliable search/filter over employee salary records, plus basic aggregate pay insights (avg/median by dept, country, role) — full analytics dashboards are not needed for this first version.
- H2: A single-role login (HR Manager only) is sufficient; no multi-user permission system is needed at this stage.
- H3: Aggregates can be computed within each employee's local currency (e.g. "average salary in EUR for Germany") without cross-currency conversion, since HR is asking "how do we pay in each market" rather than needing one normalized global number.

## Scope & Features (Day One)
- **Employee salary records** with fields: full name, employee ID, department, job title/role, country, currency, base salary, employment type (full-time/contractor), pay frequency (e.g. monthly/annual), manager (reporting line), hire date, employment status (active/inactive).
- **Search & filter with pagination**: HR can search and filter the employee list by department, country, role, employment type, and status; results paginated server-side (never load all 10,000 records at once).
- **Aggregate pay insights**: average/median salary broken down by department, country, and role, computed per-currency (no cross-currency conversion).
- **Basic CRUD**: add a new employee, edit an existing employee's record (including salary), and deactivate an employee. No bulk import/export.
- **Authentication**: a real login gate for the HR Manager using Rails 8's built-in authentication (has_secure_password-based). Single role, no permissions system.
- **Seed data**: 10,000 employees across multiple countries, generated via seed script, to reflect ACME's actual scale.

## Performance Considerations
- **Pagination is required, not optional, and done server-side** — at 10,000 records, an unpaginated list/search endpoint would be slow and wasteful. All employee list/search/filter endpoints return paginated results computed by the database (SQL `LIMIT`/`OFFSET` or equivalent), not loaded fully into Ruby and sliced in memory.
- **Search, filtering, and aggregation run in SQL, not Ruby** — filtering, searching, and computing averages/medians for pay insights happen as database queries (`WHERE`, `GROUP BY`, aggregate functions), not by pulling records into Ruby and looping/reducing over them.
- **DB indexes planned up front** — index the columns used for filtering/search and aggregation (department, country, role, employment_type, status, and any FK like manager_id), decided during architecture/schema design rather than added reactively after a slow query is found.

<!-- -------- bee-comment -------- -->
> **@developer**: with 10,000 employee records, the list needs pagination — we shouldn't load them all at once. We should also plan the database indexes upfront, before writing the queries. Pagination, search, filtering, and aggregates should all be done in SQL, not Ruby.
> **@bee**: Added a "Performance Considerations" section requiring server-side pagination via SQL, and search/filter/aggregation done as database queries rather than in-memory Ruby processing. Flagged that filter/aggregate columns need indexes decided during schema design (architecture phase), not retrofitted later.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

## Testing Considerations
- **Unit test coverage required** for core functionality (employee CRUD, search/filter logic, aggregate calculations, auth).
- Tests must be **fast, deterministic, and readable** — no reliance on real network/time/random data, no flaky external dependencies, one clear behavior asserted per test.

<!-- -------- bee-comment -------- -->
> **@developer**: We need unit test coverage that's fast, deterministic, and readable.
> **@bee**: Added a "Testing Considerations" section codifying this as a requirement, to carry into spec acceptance criteria and slice verification.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

## Process & Artifacts
- **Incremental commits**: work is committed in small, meaningful steps as it evolves (not one giant final commit), so history shows how the solution developed.
- **ADRs**: significant architecture/design decisions (stack choices, schema design, indexing strategy, etc.) are recorded as Architecture Decision Records under `docs/adr/`.

<!-- -------- bee-comment -------- -->
> **@developer**: We need incremental commits and ADRs documenting decisions.
> **@bee**: Added a "Process & Artifacts" section codifying incremental commits and ADRs (`docs/adr/`) as requirements — matches the assessment brief's ask for commit history + design/trade-off artifacts.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

## Out of Scope (and why)
- **Visual dashboards / charts** — Aggregate numbers (avg/median by dept/country/role) are in scope for v1, but presented as simple tables/figures, not charting/visualization — that's a presentation-layer add-on, not core to answering the question.
- **Payroll processing / payment execution** — This is a salary *record-keeping* system, not a payment system. Actually paying people is a separate, much larger concern (banking integration, compliance, etc.).
- **Tax calculation / statutory compliance** — Varies significantly by country and is a specialized domain; out of scope for this tool.
- **Salary history / effective-dated changes** — Only the current salary is tracked; historical changes are not retained in v1.
- **Approval workflows** (e.g. raise approvals) — No workflow requirement exists; HR edits records directly.
- **Audit trail / change logging** — Not required for this version.
- **Bulk import/export (CSV, etc.)** — Basic CRUD only; bulk operations add complexity not justified by current requirements.
- **Multi-role / permissions system** — Only one persona (HR Manager) exists; building role-based access control now would be speculative.
- **Currency conversion / normalization** — Salaries are stored in their local currency with no conversion, since no cross-country comparison is being performed in v1.

## Milestone Map

### Phase 1: Core salary record management + pay insights (this build)
- Employee salary records with full field set (as above)
- Search and filter over the employee list
- Aggregate pay insights: avg/median salary by department, country, role (per-currency, no conversion)
- Add / edit / deactivate employee
- HR Manager login (Rails 8 auth)
- Seed script generating 10,000 employees across multiple countries

<!-- -------- bee-comment -------- -->
> **@developer**: Aggregate reporting shouldn't be a future phase — build it as part of phase 1.
> **@bee**: Merged aggregate reporting into Phase 1. Added it to Success Criteria, Scope & Features, and this milestone. Removed the currency-conversion out-of-scope caveat's dependency on it — aggregates are computed per-currency (e.g. avg EUR salary in Germany), not converted to one normalized number, so no conversion logic is needed to support this. Updated H1/H3 hypotheses accordingly, and moved "visual dashboards/charts" (not raw numbers) into Out of Scope as the deferred presentation layer.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------->

## Module Structure
*(Greenfield project)*
- `employees/` — owns: Employee (salary record), Department, Country/Currency fields. Depends on: (none)
- `authentication/` — owns: HR Manager login/session. Depends on: (none)

## Open Questions
- None outstanding — all key scoping decisions were confirmed during discovery.

## Revised Assessment
Size: FEATURE (single phase — record management + aggregate pay insights)
Greenfield: yes

[x] Reviewed
