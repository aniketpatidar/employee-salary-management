# 0003: Tailwind CSS + shadcn/ui for frontend styling

## Context
The frontend (React + Vite SPA) had grown a handful of pages (health check,
login, password reset request/confirm, dashboard placeholder) styled with a
single hand-rolled `App.css` and a small set of CSS custom properties in
`index.css`. This was fine for Slice 0/1 scaffolding but doesn't scale: every
new page or slice would need more bespoke CSS, and there was no consistent
set of interactive primitives (buttons, inputs, form fields, alerts) to reuse
as the employee search/CRUD UI (later slices) grows in complexity.

This is an internal HR tool, not a marketing site — the priority is a clean,
neutral, professional look with accessible, consistent form/interactive
components, not visual flair.

## Decision
Adopt **Tailwind CSS v4** (via `@tailwindcss/vite`) as the utility-CSS layer,
and **shadcn/ui** (New York style, neutral base color) for a small set of
copy-in component primitives: `Button`, `Input`, `Label`, `Card` (+
`CardHeader`/`CardTitle`/`CardContent`), and `Alert`/`AlertDescription`. Only
the components actually used by existing pages were added — shadcn/ui is a
code-generation CLI, not a runtime dependency, so unused components carry no
cost and were not added speculatively (YAGNI).

- `components.json` configures the CLI (JSX, no RSC, `@/*` path alias,
  neutral base color, CSS variables for theming).
- Generated primitives live in `src/components/ui/*.jsx` and are treated as
  owned, editable project code (the shadcn convention), not a vendored
  dependency to upgrade in place.
- Two small local helper components were added because the same markup
  pattern repeated across 3+ pages (rule of three): `FieldError` (inline
  field-level validation text, `role="alert"`) and `AuthCard` (the shared
  centered-card layout used by the login and password-reset pages).
- `index.css` now imports Tailwind (`@import "tailwindcss"`) and defines the
  shadcn color tokens as CSS custom properties (light theme only — dark mode
  was not requested and is out of scope for now).
- This is a pure styling/infrastructure change: no component's props, state,
  validation logic, API calls, or routing changed. All existing tests
  (`LoginPage.test.jsx`, `ProtectedRoute.test.jsx`,
  `PasswordResetRequestPage.test.jsx`, `PasswordResetConfirmPage.test.jsx`,
  `App.test.jsx`) pass unmodified because they query by accessible role,
  label, and text content, not CSS classes.

## Alternatives considered
- **CSS Modules / hand-rolled CSS (status quo)**: no new dependency, but
  every new page keeps requiring bespoke CSS and there's no shared
  component vocabulary. Rejected as it doesn't scale to the remaining
  slices (employee list/search/filter/CRUD UI).
- **A full component library (MUI, Chakra, Ant Design)**: ships a runtime
  dependency and an opinionated visual language that's harder to keep
  "clean/neutral/professional" without fighting the library's defaults.
  Rejected in favor of shadcn/ui's copy-in-and-own model, which keeps the
  bundle lean and every component fully editable.

## Consequences
- New dependencies: `tailwindcss`, `@tailwindcss/vite`, `radix-ui`, `cn`,
  `class-variance-authority` (backend/API/test infra unaffected).
- Future pages should reach for existing primitives in `src/components/ui`
  before writing new bespoke CSS, and extend the shadcn/ui set via the CLI
  (`npx shadcn@latest add <component>`) only when a concrete page needs a
  component that doesn't exist yet.
