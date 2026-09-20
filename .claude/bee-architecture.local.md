## Architecture

**Pattern**: Rails MVC (backend) + Component-Based feature folders (frontend)
**Start with**: Standard Rails app structure with ActiveRecord scopes for CRUD/filtering; no service-object or query-object layer. The one non-trivial SQL concern (pay insights avg/median) lives as a single class method directly on `Employee`, not a separate class.
**File structure**:
- Backend: `app/models/employee.rb` (enums, `COUNTRY_CURRENCY_MAP`, validations, scopes: `active`, `by_department`, `by_country`, `by_role`, `by_employment_type`, `by_status`, plus `Employee.pay_insights(filters, breakdown)` class method), `app/models/user.rb`, `app/models/session.rb`, `app/controllers/employees_controller.rb`, `app/controllers/pay_insights_controller.rb`, `app/controllers/sessions_controller.rb`, `app/controllers/passwords_controller.rb`, `app/controllers/concerns/authentication.rb` (from the generator), `db/seeds.rb`
- Frontend: `src/features/auth/` (login, logout, password reset forms + auth API calls), `src/features/employees/` (list page, add/edit modals, filters, pay insights page, employee API calls), `src/lib/` or `src/shared/` for a thin fetch client (cookie-based session, CSRF token handling) shared by both features
**Key boundaries**:
- Employee CRUD/filtering/pagination is plain ActiveRecord — `WHERE`/`LIMIT`/`OFFSET`/`GROUP BY` via scopes, chained in the controller action, never loaded into Ruby and processed in memory.
- `Employee.pay_insights(filters, breakdown)` is the one method carrying real SQL complexity (per-currency avg + median via window functions) — kept as a class method (not extracted into its own class) per developer preference, but should be a single well-named method with a docstring/comment on the query shape so a reviewer can follow it without external context.
- The `Authentication` concern (from the Rails generator) is shared infrastructure included by `ApplicationController` — every non-auth controller depends on it for the login gate, but this is cross-cutting (like CSRF), not a domain dependency between the `employees` and `authentication` modules themselves.
**Dependency direction**: Controllers depend on `Employee`/`User`/`Session` models, never the reverse. `employees` module (Employee, Department, Country/Currency) has no dependency on `authentication` module (User, Session) and vice versa, per BOUNDARIES.md — the only shared touchpoint is the `Authentication` controller concern, applied uniformly via `ApplicationController`. React features depend on the shared fetch client, never the reverse; `employees` and `auth` feature folders don't import from each other.

### Median Calculation — Implementation Guidance for `Employee.pay_insights`

SQLite has no native `MEDIAN()`. Use window functions (works generically for even and odd group sizes):

```sql
WITH ranked AS (
  SELECT
    base_salary,
    currency,
    <breakdown_column> AS group_value,   -- department/country/role, chosen via an explicit allowlist/case — never interpolate raw params
    ROW_NUMBER() OVER (
      PARTITION BY <breakdown_column>, currency
      ORDER BY base_salary
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY <breakdown_column>, currency
    ) AS cnt
  FROM employees
  WHERE <applied filters: department/country/role/employment_type/status>
)
SELECT
  group_value,
  currency,
  AVG(base_salary) AS median,     -- averages the 1 or 2 middle rows
  cnt AS count
FROM ranked
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)   -- integer division; collapses to one row when cnt is odd
GROUP BY group_value, currency, cnt
```

- Run this as a second, separate query alongside a plain `GROUP BY <breakdown_column>, currency` query for average + count (`AVG(base_salary)`, `COUNT(*)`) — don't force both into one CTE, it stays more readable as two queries.
- `Employee.pay_insights` merges the two result sets by `(group_value, currency)` key in Ruby — this merge is key-matching only, no numeric computation, so it doesn't violate the SQL-only aggregation rule.
- `<breakdown_column>` must come from an explicit allowlist (`department`/`country`/`role` only) mapped via a `case`/hash lookup — never interpolate the `breakdown` param directly into SQL.
- Test directly against known fixture rows with hand-computed expected medians, including at least one group with an even employee count to exercise the two-middle-values-averaged branch, and one with an odd count.
- Record as its own ADR under `docs/adr/`, e.g. "Median calculation via SQL window functions (SQLite)," per the spec's Technical Context requirement.

## Evolution Triggers
- If `Employee.pay_insights` grows past the avg/median/count query pair (e.g. a v2 adds more aggregate metrics or cross-currency conversion) → extract it into its own `PayInsightsQuery` class; the method is the natural extraction seam already.
- If filtering/pagination logic starts getting duplicated or grows beyond simple scope chaining (e.g. more complex combined filters, sorting options) → consider a query object or `Ransack`-style filter object for `EmployeesController#index`.
- If a second entity is introduced that needs manager-style hierarchical logic or additional business rules beyond validations → consider extracting domain logic out of the `Employee` model into a plain service object at that point.
- If `authentication/` needs to support more than one role or permission level → introduce an authorization layer (e.g. Pundit) rather than ad hoc role checks in controllers.
- If reporting/aggregation needs grow significantly (multiple report types, scheduled exports, etc.) → consider a dedicated `app/queries` or reporting namespace at that point, not before.

## Slice Order

Confirmed unchanged from spec — no reorder needed. Slice 1 (Auth + Seed) → Slice 2 (List) → Slice 3 (CRUD) → Slice 4 (Pay Insights):
- Slice 1 → 2: List depends on the Employee model, migration, indexes, and seed data, all created in Slice 1.
- Slice 2 → 3: Add/Edit modals are explicitly opened from the Employee List page per the spec, so Slice 3 depends on Slice 2's list UI existing.
- Slice 3 → 4: Pay Insights only depends on the Employee model/data from Slice 1 (not on CRUD), but building it last still matches the spec's stated order with no dependency violation.
- Each slice boundary is independently releasable: working login + seeded data after Slice 1, working read-only list after Slice 2, full CRUD after Slice 3, complete feature set after Slice 4.

## Options Considered
- **Option A** (query object for pay insights): rejected by developer preference for less ceremony.
- **Option B — chosen**: thin controllers, ActiveRecord scopes for CRUD/list, plain `Employee.pay_insights` class method for the aggregate SQL.
- **Option C** (full service-object layer for everything, incl. CRUD): rejected as over-engineering relative to this scope — no orchestration/side-effects needed for simple CRUD.
