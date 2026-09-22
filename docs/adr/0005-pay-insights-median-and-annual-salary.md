# 0005: Median via SQL window functions, and base_salary as an annual amount

## Context
Slice 4 needs per-currency average and median salary, grouped by department,
country, or role, over 10,000 rows, filtered the same way as the Employee
list. SQLite has no native `MEDIAN()` aggregate. Separately, `base_salary`
sits alongside `pay_frequency` (monthly | annual), and employees paid monthly
vs. annually need a comparable number for these aggregates and for display.

## Decision
Median is computed with two plain SQL queries against the same filtered
`Employee` scope (built once, reused via `to_sql` for the median query so
both queries see identical filters), merged by `(group, currency)` in Ruby
with no numeric work in that merge:
1. `GROUP BY <breakdown>, currency` for `AVG(base_salary)` and `COUNT(*)`.
2. A window-function query (`ROW_NUMBER()` + `COUNT()` `OVER (PARTITION BY
   <breakdown>, currency ORDER BY base_salary)`), keeping the middle row(s)
   and averaging them — one or two rows depending on odd/even group size.

The breakdown column is resolved through an explicit allowlist hash
(`department`/`country`/`role`), never interpolated directly from the
request parameter, before it touches any SQL string. `Employee.pay_insights`
stays a single class method per the architecture decision, not a separate
query object.

`base_salary` is documented as an **annual** amount. `pay_frequency` only
describes how it's paid out (monthly installments vs. one annual payment);
it does not change the stored magnitude. No schema change — this is a
naming/semantics clarification so monthly- and annual-frequency employees'
salaries are directly comparable in Pay Insights without conversion.

## Consequences
- Aggregates are always computed strictly per currency (see spec's Known
  Limitations) — a group with employees in two currencies produces two rows,
  never blended.
- If a second aggregate metric or cross-currency conversion is ever needed,
  `Employee.pay_insights` is the natural seam to extract into a dedicated
  query object (see architecture's Evolution Triggers) — not needed yet.
- Future work that changes what "annual" means (e.g. pro-rating contractors)
  must revisit both the seed data ranges and this documented semantics.
