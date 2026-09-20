# 0001: Integer-backed Rails enums for department, role, and country (no lookup tables)

## Context
`Employee` needs `department`, `role`, and `country` fields drawn from fixed,
confirmed lists (10 departments, 13 roles, 10 countries — see spec). These
lists are not expected to change without a code change/redeploy in this
build (no admin UI for managing them — explicitly out of scope). `currency`
is derived 1:1 from `country` via a fixed mapping and must support fast,
index-friendly `GROUP BY currency` aggregation at 10,000-row scale (Slice 4).

Two options were considered:
- **A: separate lookup tables** (`Department`, `Role`, `Country` models with
  FK columns on `Employee`) — supports future admin CRUD of the lists, joins
  needed for display/filter.
- **B: Rails integer-backed `enum` attributes** declared as fixed constants
  directly on `Employee` — no joins, no separate tables, values fixed in code.

## Decision
Use **Option B** — `department`, `role`, `country`, `currency`,
`employment_type`, `pay_frequency`, and `status` are all Rails `enum`
attributes backed by integer columns, declared with `validate: true` so an
out-of-list value (e.g. a tampered API request) produces a normal
`ActiveRecord` validation error instead of raising `ArgumentError`.

`currency` is derived automatically from `country` via a
`COUNTRY_CURRENCY_MAP` constant (`before_validation` callback on `Employee`)
and stored on the row — never computed at read time — so `GROUP BY currency`
aggregate queries (Slice 4) need no join or runtime lookup.

## Consequences
- Filtering/grouping by these columns is exact-integer-equality and
  index-friendly — no string collation concerns, cheap indexes (added in the
  initial migration on `department`, `country`, `role`, `employment_type`,
  `status`, `manager_id`).
- No admin UI is needed or possible for editing these lists at runtime —
  adding/renaming/removing a value requires a code change and a migration
  data-fix if existing rows use the value. Acceptable per spec's explicit
  scope (no admin CRUD for these lists in v1).
- A lookup-table approach would have been YAGNI at this scope — no
  independently-manageable records are needed, and a lookup table would add
  join overhead to every list/filter/aggregate query without a benefit this
  build actually needs.
- `enum ..., validate: true` was chosen over the Rails default enum behavior
  (which raises `ArgumentError` on an invalid assignment) specifically so
  Slice 3's "tampered request" validation ACs return a normal `422` with a
  field error rather than crashing the request.
