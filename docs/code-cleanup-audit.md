# Admin Portal Cleanup Audit

## What changed in this pass

- Replaced the template README with project-specific architecture notes.
- Added inline documentation to the bootstrap, auth, router, and shared API client layers.
- Centralized repeated filtered-query serialization in `src/api/query.ts`.
- Centralized pagination typing in `src/api/types.ts`.
- Removed dead Vite scaffold files that were no longer referenced by the real app.

## Highest-value cleanup candidates

### 1. Route registration is too centralized

`src/routes/App.tsx` is the single source of truth for every route, but it is
now over 800 lines and repeats the same CRUD routing patterns per domain.

Recommended direction:

- Split route registration into feature manifests such as `routes/catalog.tsx`,
  `routes/crm.tsx`, `routes/settings.tsx`, and `routes/ems.tsx`.
- Keep only top-level auth guards and route composition in `src/routes/App.tsx`.
- Store permission metadata with the route definitions instead of hand-wrapping
  each `<Route>` in `RequirePerm`.

### 2. CRUD screens should share more table/form infrastructure

There are 21 `*ListPage.tsx` files and 18 `*FormPage.tsx` files under `src/screens/`.
Many of them repeat the same loading states, pagination handling, form mutation
flow, and success/error messaging.

Recommended direction:

- Introduce feature-agnostic hooks such as `useCrudList`, `useCrudForm`, and
  `useDeleteAction`.
- Extract column/filter configuration into domain-specific metadata instead of
  rebuilding table behavior in each page.
- Consider a `src/modules/crud/` folder for reusable page scaffolding.

### 3. API modules still repeat thin CRUD wrappers

`src/api/catalog.ts`, `src/api/ems.ts`, and `src/api/subscriptions.ts` are the
largest API modules. The new query helper removed one layer of duplication, but
many request wrappers still follow the same `fetch/create/update/delete` shape.

Recommended direction:

- Add a small `createCrudApi()` helper for standard DRF resources.
- Keep feature-specific workflows like bulk actions and file uploads in the
  domain modules, but generate the repetitive CRUD surface.

### 4. Report query builders can be standardized

`src/api/reports.ts` still manually builds `URLSearchParams` for each report
endpoint. The patterns are similar enough that a report query builder could
remove repeated pagination, date-range, and location serialization.

Recommended direction:

- Extract shared report parameter helpers for `start`, `end`, `location_ids`,
  pagination, and sort/order options.
- Keep each report function focused on endpoint-specific options.

### 5. Auth state owns some UI concerns

`src/auth/AuthContext.tsx` currently owns session state, user normalization,
theme restoration, and the `can()` helper. It works, but those concerns are
starting to blur together.

Recommended direction:

- Move payload normalization into an auth adapter module.
- Keep theme restoration in a UI/session hook so auth context only owns auth.
- Preserve `can()` as the public permission API to avoid scattering RBAC checks.
