# Spec: Employee Salary Management System

## Overview
A web app for ACME's HR Manager to replace spreadsheet-based salary tracking: search/filter 10,000 employee salary records, manage them via basic CRUD, and view aggregate pay insights (avg/median by department, country, role), gated behind a single-role login. Rails 8 API backend + React (Vite) frontend, SQLite database.

## Slice 0: Scaffold + Deploy (walking skeleton, before any feature work)
Empty Rails 8 API app and empty React (Vite) app, wired together, both deployed live — proves the deployment pipeline works before any feature logic exists.

- [x] Rails 8 API app created, runs locally (`rails s` or equivalent), responds to a basic health-check route
- [x] React (Vite) app created, runs locally (`npm run dev`), renders a placeholder page
- [x] React app successfully calls the Rails API health-check route and displays the response (proves the two apps are wired together, not just running side by side)
- [x] Rails API is deploy-ready (deployment config committed — e.g. Dockerfile/`render.yaml`/Procfile as appropriate for the chosen host) and documented in the README with exact deploy steps
- [x] React app is deploy-ready (build config + env-based API base URL, no hardcoded localhost) and documented in the README with exact deploy steps
- [ ] Developer performs the actual live deploy (external account/credentials not available to the coding agent) and adds both live URLs to the README once done

<!-- -------- bee-comment -------- -->
> **@developer**: prior to feature slices, both frontend and backend apps should be up and running and deployed
> **@bee**: Added Slice 0 — scaffold + deploy both apps as an empty walking skeleton before any feature work starts (Slice 1 onward). Confirmed as its own slice, not folded into Slice 1, per developer's follow-up answer.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

## Slice 1: Authentication + Seed Data (walking skeleton)
The foundation everything else sits behind: a real login gate and a realistic 10,000-employee dataset to build and test against.

- [x] HR Manager can log in with email and password
- [x] Login form shows inline validation errors when email or password is left blank
- [x] Shows a generic "Invalid email or password" message on failed login (does not reveal which field was wrong, no lockout/rate-limiting)
- [x] Unauthenticated visitors are redirected to the login page when attempting to access any employee page
- [x] Logged-in HR Manager can log out, ending the session (session row invalidated/deleted, cookie cleared) and returning to the login page
- [x] HR Manager can request a password reset via email address; a reset link is generated (token-based, 15-minute expiry, per Rails 8 generator defaults)
- [x] Reset link lets the HR Manager set a new password, after which the old password no longer works
- [x] Shows a generic confirmation message after requesting a reset regardless of whether the email matches an account (no account enumeration)
- [x] Expired or invalid reset tokens show an error instead of allowing a password change
- [x] Seed script populates the database with 10,000 employee records spanning multiple countries/currencies, departments, roles, and employment types, using only values from the predefined lists (see Enum Fields below)
- [x] Seed script produces a mix of active and inactive employees (so status filtering is testable from day one)
- [x] Seed script is re-runnable in a fresh dev/test database without manual cleanup steps
- [x] Seed script creates exactly one HR Manager login credential (alongside the 10,000 employee records), documented in the README for reviewer login — this is the only way an HR Manager account is created; there is no self-registration/signup flow

### Auth Mechanism (explicit, not "Rails built-in auth" in the abstract)
- Generated via Rails 8's `bin/rails generate authentication` scaffold — not Devise, not a hand-rolled auth system, not a third-party identity provider.
- **User model**: `has_secure_password`, `password_digest` column, unique-indexed `email_address`. Passwords are hashed with bcrypt (the generator adds the `bcrypt` gem) — plaintext passwords are never stored or logged.
- **Session model**: database-backed. A `sessions` table stores a unique `token` (via `has_secure_token`), plus `ip_address` and `user_agent`, associated to the `User`.
- **Session mechanism**: on login, a `Session` row is created and its token is set in a permanent, HTTP-only, signed cookie. This is **not** a JWT and **not** a bearer token in an Authorization header — it's Rails' standard cookie-store session, and the cookie value only ever contains the opaque session token, which is matched against the `sessions` table on each request via a `Current`-attributes-based authentication concern.
- **CSRF**: standard Rails `protect_from_forgery` / CSRF token behavior applies to the login form and any state-changing request, per Rails defaults.
- **No OAuth, no third-party identity provider, no MFA.**
- **No self-service signup flow — confirmed.** The generator does not scaffold account creation by default, and the developer has confirmed this matches intent: the single HR Manager account is created exclusively by the seed script, never via a signup form.
- **Password reset — confirmed kept.** The generator's built-in password-reset flow (token-based reset link + mailer, 15-minute expiry) is retained as-is. The mailer is wired to development/console output (`config.action_mailer.delivery_method = :test` or equivalent log-to-console/letter_opener setup) rather than a real SMTP/external email service — no production email delivery infrastructure is required for this build.

### API Shape
```
POST /session
{ email_address, password }
→ 200 (Session row created, session cookie set) | 401 "Invalid email or password"

DELETE /session
→ 200 (Session row destroyed, cookie cleared)

POST /passwords
{ email_address }
→ 200 (generic confirmation message, reset email delivered to dev/console output)

PATCH /passwords/:token
{ password, password_confirmation }
→ 200 (password updated) | 422/404 (invalid or expired token)

GET /employees  (or any protected route)
→ 401 when no valid session cookie / matching Session row
```

### Data Model (Employee — created this slice, used by all later slices)
```
Employee:
  id                (database auto-increment primary key — this IS the Employee ID;
                     no separate employee_id field or generator exists; `id` is the
                     single identifier referenced throughout the UI and API)
  full_name
  department         (enum, fixed list — see Enum Fields below)
  role / job_title   (enum, fixed list — see Enum Fields below)
  country            (enum, fixed list — see Enum Fields below)
  currency           (enum, auto-derived from country at write time; not independently
                      settable, not exposed as an editable field)
  base_salary        (decimal, positive, annual amount — pay_frequency only
                      describes payout cadence, not the stored magnitude)
  employment_type    (full_time | contractor)
  pay_frequency       (monthly | annual)
  manager_id         (optional FK -> Employee.id, nullable)
  hire_date          (date, not in the future)
  status             (active | inactive, default active)
```
DB indexes required on: `department`, `country`, `role`, `employment_type`, `status`, `manager_id` — planned in the initial migration, not retrofitted later.

### Enum Fields (department, role, country) — mechanism decision, all values confirmed
- **Department, role, and country are Rails `enum` attributes backed by integer columns**, not free-text strings. Each is declared as a fixed constant list in the `Employee` model (e.g. `enum :department, { engineering: 0, sales: 1, marketing: 2, ... }`). This is the chosen approach over a separate lookup table (e.g. a `Department` model/table) because the value sets are small, fixed for this scope, and don't need independently manageable records (no admin CRUD for these lists — see Out of Scope). A lookup table would be YAGNI here; a plain string column would reintroduce the typo/casing risk this change exists to prevent.
- Integer-backed enum columns keep filtering/grouping fast and index-friendly (exact integer equality/`GROUP BY`, no string collation concerns) at 10,000-row scale.
- **Currency is a fixed 1:1 derivation from country** — confirmed. Every country in the predefined list maps to exactly one currency; countries with multiple real-world official currencies are not modeled, and there is no per-employee override. A `COUNTRY_CURRENCY_MAP` constant sets `currency` automatically whenever `country` is set (on create and on edit, if country is ever changed). Currency is stored (not computed on read) so aggregate `GROUP BY currency` queries don't need a join or runtime lookup.

**Confirmed country → currency lookup table** (predefined country list, one currency each):

| Country | Currency |
|---|---|
| United States | USD |
| Canada | CAD |
| United Kingdom | GBP |
| Germany | EUR |
| France | EUR |
| India | INR |
| Australia | AUD |
| Japan | JPY |
| Brazil | BRL |
| Singapore | SGD |

Note Germany and France intentionally share EUR — the mapping is 1:1 per country (each country has exactly one currency), not 1:1 per currency (a currency can serve multiple countries).

**Confirmed department list** (10 values, fixed): Engineering, Sales, Marketing, Finance, Human Resources, Operations, Customer Support, Legal, Product, Design.

**Confirmed role/job-title list** (flat, fixed, 13 values): Software Engineer, Engineering Manager, Account Executive, Sales Manager, Marketing Specialist, Financial Analyst, HR Business Partner, Operations Manager, Support Specialist, Product Manager, Designer, Legal Counsel, Executive. Role and department are independently selected — there is no rule enforcing "this role only belongs to that department" (that validation matrix is explicitly out of scope, see below).

All three enum lists (country, department, role) and the country→currency mapping are locked in — no further confirmation needed before implementation.

## Slice 2: Employee List — Search, Filter, Pagination
- [x] Employee List page shows a paginated table of employees (name, ID [database `id`], department, role, country, employment type, status)
- [x] List is paginated server-side (e.g. page + page size); browsing pages never loads the full 10,000-record dataset into the browser or into Ruby memory
- [x] Default list view shows only active employees
- [x] HR Manager can filter the list by department via a dropdown of the predefined department list (not free-text)
- [x] HR Manager can filter the list by country via a dropdown of the predefined country list (not free-text)
- [x] HR Manager can filter the list by role via a dropdown of the predefined role list (not free-text)
- [x] HR Manager can filter the list by employment type
- [x] HR Manager can filter the list by status, including explicitly viewing inactive employees
- [x] Filters can be combined (e.g. department=Sales AND country=Germany)
- [x] Shows an empty-state message when no employees match the current filters

### API Shape
```
GET /employees?department=&country=&role=&employment_type=&status=&page=&per_page=
→ 200 { employees: [...], page, per_page, total_count }
```

## Slice 3: Employee CRUD (Add / Edit / Deactivate)
- [x] HR Manager can open an "Add Employee" modal from the Employee List page
- [x] Add form requires full name, department, role, country, base salary, employment type, pay frequency, and hire date
- [x] Department, role, and country are select/dropdown inputs populated from the predefined lists — not free-text inputs
- [x] ID (the database's auto-increment `id`) and currency are system-assigned/derived and not present as editable fields in the form — there is no separate "Employee ID" input, and currency is not a dropdown either (it's set automatically from the chosen country)
- [x] Shows an inline error when base salary is zero, negative, or not a valid number
- [x] Shows an inline error when hire date is in the future
- [x] Shows an inline error when a required field is left blank
- [x] Shows an inline error if a department, role, or country value outside the predefined list is submitted (defends against tampered requests bypassing the dropdown)
- [x] Manager field is optional; when set, only active employees are selectable (no inactive employees, no self-reference)
- [x] Newly added employee appears in the list (subject to currently active filters) after saving, with its assigned `id` visible
- [x] HR Manager can open an "Edit Employee" modal from the list to update any field, including salary, on an existing employee
- [x] Edit form applies the same validation rules as Add, including dropdown-constrained department/role/country
- [x] Changing country on edit re-derives currency automatically (currency is never left stale relative to country)
- [x] HR Manager can deactivate an employee from the list
- [x] Deactivated employee disappears from the default (active-only) list view immediately
- [x] Deactivated employee is still visible when explicitly filtering status=inactive
- [x] Deactivating an employee who is set as another employee's manager does not delete or clear that reporting reference

### API Shape
```
POST /employees
{ full_name, department, role, country, base_salary, employment_type, pay_frequency, hire_date, manager_id? }
→ 201 { employee: { id, ... } } | 422 { errors: { field: [message] } }

PATCH /employees/:id
{ ...any updatable field including base_salary }
→ 200 { employee } | 422 { errors }

PATCH /employees/:id/deactivate
→ 200 { employee: { status: "inactive" } }
```

## Slice 4: Aggregate Pay Insights
- [x] HR Manager can navigate to a Pay Insights page
- [x] Pay Insights page provides the same dropdown filter controls as the Employee List (department, country, role, employment type, status)
- [x] By default, Pay Insights includes only active employees unless the status filter is changed
- [x] HR Manager can choose a breakdown dimension: department, country, or role
- [x] Results show average and median salary per group within the chosen dimension
- [x] Each group's avg/median is computed per-currency, with no cross-currency conversion, summing, or blending (e.g. Engineering employees paid in EUR are shown separately from Engineering employees paid in USD — never combined into one number)
- [x] Aggregate results reflect only employees matching the currently applied filters
- [x] Shows a "no results" state when the current filters match zero employees

### API Shape
```
GET /pay_insights?breakdown=department|country|role&department=&country=&role=&employment_type=&status=
→ 200 { groups: [ { group: "Engineering", currency: "EUR", average: 68000.00, median: 65000.00, count: 42 }, ... ] }
```

## Out of Scope
- Separate employee detail page — add/edit happen via modal on the Employee List page
- Separate "Employee ID" field/generator distinct from the database `id` — the auto-increment primary key is the only identifier
- Admin UI for managing the department/role/country lists — these are fixed constant lists defined in code/config for this build; adding, renaming, or removing a value requires a code change and redeploy, not a UI feature
- Validation matrix enforcing which roles belong to which departments — role and department are independently selected fixed lists with no cross-constraint
- Countries with multiple official/real-world currencies — the country→currency mapping is strictly 1:1 per country; no per-employee currency override and no modeling of multi-currency countries
- Visual dashboards / charts — Pay Insights shown as tables/figures, not charting
- Payroll processing / payment execution
- Tax calculation / statutory compliance
- Salary history / effective-dated changes — only current salary is tracked
- Approval workflows (e.g. raise approvals)
- Audit trail / change logging
- Bulk import / export (CSV, etc.)
- Multi-role / permissions system — single HR Manager role only
- **Currency conversion / normalization — the known biggest limitation of v1's Pay Insights feature.** Aggregates are computed strictly per-currency and never converted, summed, or blended across currencies in this build. This means v1 cannot answer "what's our average global salary" or support pay-equity comparisons across countries — those questions require converting every salary to a common currency first, which this build does not do. This is flagged as the clear top candidate for a v2, not a vague maybe. Building it would require: picking an exchange-rate data source (and whether it's a paid API, a periodically-updated static table, etc.), deciding on rate freshness/staleness handling (e.g. daily rates vs. real-time, what happens to historical aggregates when rates change), and defining rounding rules for converted amounts.
- Login rate-limiting or account lockout
- OAuth / third-party identity providers / MFA
- Self-service signup — confirmed: HR Manager account is created exclusively by the seed script, no signup form exists
- Real/external email delivery (SMTP, third-party email service) — password-reset mailer is wired to development/console output only, no production email infrastructure
- Cascading manager reassignment when a manager is deactivated (reference is left as-is; no history tracking)
- Full-text/fuzzy search — filtering is structured (exact-match dropdown selection on department/country/role/employment_type/status), not free-text search

## Known Limitations / Top v2 Candidate
- **No cross-currency comparison.** Because Pay Insights computes avg/median strictly per-currency with no conversion (see Out of Scope), the HR Manager cannot get a single global average salary figure or directly compare pay equity between, say, Germany and the US. This is the single clearest, most-requested-sounding gap in v1 and the natural next feature to build, once the following are decided: an exchange-rate source, a staleness/freshness policy for rates, and rounding rules for converted figures.

## Review Adjustments

<!-- -------- bee-comment -------- -->
> **@developer**: add/edit as modal on list page, skip the separate detail page
> **@bee**: Dropped the separate Employee Detail/Edit page. Slice 3 now specs "Add Employee" and "Edit Employee" as modals opened from the list.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: employee id system-generated + unique, base salary positive w/ cents, currency tied to country not free text
> **@bee**: Applied to the data model and validation ACs — later refined further (see next card) once the developer clarified the ID scheme should just be the DB primary key.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: use database employee id as employee id
> **@bee**: Removed the dual-ID scheme. `employees.id` is now the sole identifier, referenced throughout the UI and API. Updated Slice 1 data model, Slice 2 list column, Slice 3 ACs, API shapes, and added an explicit Out of Scope line ruling out a separate Employee ID field.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: manager optional, must be active employee, no self-ref. hire date not future. inactive hidden by default
> **@bee**: Applied to Slice 1 data model (nullable `manager_id`) and Slice 3 ACs (active-only manager selection, no self-reference, future-hire-date validation, deactivated-employees-hidden-by-default behavior in Slice 2/3).
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: one pay insights view, pick a dimension, filters should apply to it too
> **@bee**: Slice 4 specs a single Pay Insights page with a breakdown-dimension selector and the same filter controls as the Employee List; results reflect only employees matching current filters.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: inline field errors on forms, generic "invalid email or password" on login fail, no lockout
> **@bee**: Applied throughout Slice 1 (login) and Slice 3 (Add/Edit form) ACs.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: slice order: auth+seed, then list, then crud, then insights
> **@bee**: Spec is organized in exactly this order (Slices 1-4).
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: exact mechanism isn't explicitly stated, spell it out
> **@bee**: Added an explicit "Auth Mechanism" section in Slice 1: `bin/rails generate authentication` scaffold, bcrypt via `has_secure_password`, database-backed `Session` model with signed HTTP-only cookie (not JWT/bearer token), standard Rails CSRF protection, no OAuth/MFA.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: seed one HR Manager account
> **@bee**: Confirmed and locked into Slice 1: the seed script creates exactly one HR Manager credential; this is the only way an account is created.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: keep password reset flow, just point mailer at console/dev output instead of real email
> **@bee**: Locked in — Slice 1 ACs cover the reset-link request/confirm flow, and the Auth Mechanism section states the mailer is wired to development/console output, no real SMTP.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: are department, country, and role free-text fields, or should they come from predefined values?
> **@bee**: Modeled as Rails integer-backed `enum` attributes with fixed constant lists (not a lookup table — YAGNI at this scope). Add/edit form and filter UI use dropdowns, not text inputs. Added an Out of Scope note: no admin UI for managing these lists.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: currency is derived from country — should we define a fixed country→currency mapping, and what happens if a country uses multiple currencies?
> **@bee**: Added the confirmed 10-country → currency lookup table to Slice 1, with a `COUNTRY_CURRENCY_MAP` constant deriving and storing currency automatically from country. Added an Out of Scope line for multi-currency countries.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: since there's no currency conversion, should aggregates be done per currency as specced? ...but we might need to think about currency conversion though
> **@bee**: Slice 4 AC states per-currency aggregation with no blending. Strengthened the Out of Scope entry and added a standalone "Known Limitations / Top v2 Candidate" section naming currency conversion as the clearest v1 gap and the specific decisions a v2 would need (exchange-rate source, freshness policy, rounding rules).
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

<!-- -------- bee-comment -------- -->
> **@developer**: all should be added as requested — dept list and illustrative role list are fine as-is
> **@bee**: Both lists are now locked in, not placeholders (Slice 1 → Enum Fields).
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

## Technical Context
- Stack: Rails 8 API backend, React (Vite) frontend, SQLite database
- Auth: Rails 8's `bin/rails generate authentication` scaffold — bcrypt-hashed passwords via `has_secure_password`, database-backed `Session` model with a signed HTTP-only cookie holding an opaque session token, standard Rails CSRF protection, no OAuth/MFA. Single HR Manager account created exclusively by the seed script (confirmed, no self-service signup). Password-reset flow (token link + mailer) is kept, mailer wired to dev/console output rather than real SMTP. No permissions system.
- Employee identifier: the database's auto-increment primary key (`employees.id`) is the sole Employee ID, used throughout the UI and API — no separate `employee_id` field, sequence, or generator.
- Department, role, and country are Rails integer-backed `enum` attributes with fixed constant lists defined in the `Employee` model — not free-text strings, not a separate lookup table (YAGNI at this scope, no admin management needed). Currency is derived and stored automatically from country via a confirmed, fixed 1:1 `COUNTRY_CURRENCY_MAP` (see Slice 1 → Enum Fields for the full table). All enum list values (10 countries with their currency mapping, 10 departments, 13 roles) are confirmed and locked in — no longer placeholders.
- Module boundaries (`.claude/BOUNDARIES.md`): `employees/` owns Employee, Department, Country/Currency fields, no dependencies; `authentication/` owns HR Manager login/session, no dependencies
- Pagination, filtering, and aggregation MUST be implemented as SQL queries (`WHERE`, `LIMIT`/`OFFSET`, `GROUP BY`, aggregate functions) — never loaded into Ruby and sliced/looped/reduced in memory
- DB indexes on `department`, `country`, `role`, `employment_type`, `status`, `manager_id` must exist from the initial schema migration
- SQLite has no native `MEDIAN` aggregate — median calculation needs an explicit SQL strategy (e.g. window functions / percentile emulation via subquery); flag as an ADR decision
- Unit test coverage required for CRUD, search/filter, aggregate calculations, and auth; tests must be fast, deterministic, and readable (no real network/time/random dependencies)
- Work is committed incrementally; significant architecture/design decisions (schema design, indexing strategy, enum vs. lookup-table choice, median calculation approach, pagination approach, auth generator customization) are recorded as ADRs under `docs/adr/`
- Deployment: working software deployed live (e.g. Render/Railway), video demo, and shareable repo link are required deliverables alongside the code
- Risk level: MODERATE (real auth + salary data, but no payments/PII beyond names, no external integrations)

[x] Reviewed
