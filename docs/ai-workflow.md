# How I built this with AI

I built this with Claude Code, using the Bee plugin's `/bee:sdd` spec-driven workflow. I gave it the assessment PDF and worked through the project one step at a time. I made the product and design calls. Agents drafted the docs, code and tests, and nothing went into a commit until I had reviewed it. The workflow state and module boundaries are in [`.claude/`](../.claude/).

## Requirements and spec

A discovery agent interviewed me about the brief and wrote the [requirements doc](specs/employee-salary-management-discovery.md). I reviewed it with inline `@bee` comments. That review pulled pay insights into v1, and added server-side pagination, planned indexes, SQL-only aggregation, test expectations, incremental commits, ADRs and the deploy and demo deliverables.

A spec agent then split the work into [vertical slices with acceptance criteria](specs/employee-salary-management-spec.md). The decisions there were mine: Rails 8 auth with one seeded HR account, the database `id` as the employee ID, fixed lists for department, role and country, one currency per country, per-currency aggregates with conversion left for v2, and add/edit in a modal.

For [architecture](architecture.md) I picked plain Rails MVC, with pay insights as a class method on `Employee` rather than a query object or a service layer.

## Building it

I added a Slice 0 before any features: deploy the two empty apps first. That paid off, because deployment problems showed up while there was nothing else to debug.

Each slice went through three agents. One wrote the code, a separate one wrote tests against it, and a verifier checked the tests, the acceptance criteria, the SQL-only rule and the module boundaries. I only committed a slice once the verifier passed it and I had looked at the diff.

That loop caught real bugs. Employees whose manager had been deactivated could no longer be edited, because the manager check ran on every save. The manager search didn't treat `%` and `_` literally, since SQLite ignores backslash escapes without an `ESCAPE` clause. It also caught frontend tests that had raised timeouts instead of being fixed, and seed salaries that used one range for every currency, which made JPY and INR insights meaningless.

Deploying surfaced two more. Login worked locally but not in production: Vercel and Render are different sites, so the browser dropped the `SameSite=Lax` session cookie. I fixed that by proxying `/api` through Vercel ([ADR 0004](adr/0004-proxy-api-through-frontend-origin.md)). And a `secure` cookie is silently skipped behind Render's TLS proxy unless `assume_ssl` is on.

## Reviews after the build

Once all slices were done I ran three review-only passes. Each gave me a ranked list, and I picked what to apply.

Bee's final reviewer checked the whole build. It found that the seeder made about 60% of employees contractors instead of 20%, and that my docs claimed a persistent disk and working password reset on a free tier that has neither. The generated CI workflow sat under `backend/` and never ran the tests, and filter handling was duplicated across two controllers and two pages. I fixed all of it and made a 401 mid-session send you back to login.

Then I reviewed the backend with the [37signals skills](https://github.com/marckohlbrugge/37signals-skills). Deactivate became a `deactivation` resource instead of a custom verb, salaries stopped appearing in request logs, and the session cookie now expires after two weeks instead of twenty years.

Last, a [Sandi Metz rules skill](https://github.com/lucianghinda/superpowers-ruby/tree/main/skills/sandi-metz-rules). `Employee` was over 100 lines, so pay insights moved into an `Employee::PayInsights` concern, and the seeder's long methods were split up.

I didn't take every suggestion. Employee test data stays inline, so the hand-computed medians sit right next to their assertions. The seeder keeps its keyword arguments instead of an options object.

## Where it went wrong

The AI got things wrong too. It wrote long comments and a long README until I told it to cut them. At one point the Vercel site looked broken, and it went looking for a build problem when the real cause was a commit I hadn't pushed. It also wrote a CI command, `bin/rails db:test:prepare test`, without running it locally, and the first CI run failed on it.

## Other calls I made

I chose Tailwind and shadcn/ui for the UI, and I treated `base_salary` as an annual amount so staff paid monthly and annually can be compared. The database seeds itself only when it's empty, so a restart never overwrites real data on a persistent disk. The live demo is on Render's free tier with no disk, so it reseeds after every sleep. I also took the scaffold health-check page out of the UI, and kept comments and the README short, with the reasoning in the [ADRs](adr/).
