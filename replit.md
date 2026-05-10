# Ozone High School Payment System

A school fee payment management web app where parents pay fees for their children, cashiers review manual receipts, and admins manage student-parent links.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/school-payment run dev` — run the frontend (port 25518)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Zustand, wouter
- API: Express 5 + bcryptjs + jsonwebtoken
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — users.ts, students.ts, payments.ts
- `artifacts/api-server/src/routes/` — auth.ts, students.ts, payments.ts, admin.ts, dashboard.ts
- `artifacts/api-server/src/lib/auth.ts` — JWT helpers and middleware
- `artifacts/school-payment/src/pages/` — login, register, parent/, cashier/, admin/
- `artifacts/school-payment/src/lib/auth.ts` — Zustand token store

## Test Accounts (pre-seeded)

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Admin   | admin@ozone.edu.et         | admin123    |
| Cashier | cashier@ozone.edu.et       | cashier123  |
| Parent  | parent@ozone.edu.et        | parent123   |

Pre-linked students for the parent: Liya Bekele (Grade 10-A), Dawit Bekele (Grade 8-B), Sara Bekele (Grade 11-C)

## Architecture decisions

- JWT tokens stored in localStorage; `setAuthTokenGetter` injects them on every API call via the custom-fetch layer
- Mock Chapa flow: generates a `txRef`, redirects to `/parent/success?txRef=...`, then verifies & marks payment approved
- Manual payments start as `pending`, cashiers approve/reject them
- `parent` role sees only their own children/payments; `cashier`/`admin` see everything
- Single `routes/index.ts` barrel registers all route files for easy demo navigation

## Product

- **Parent:** See student cards → pick a student → pay via Chapa (mock) or upload bank receipt → view full payment history
- **Cashier:** View all pending manual uploads, filter by student, approve or reject with optional notes
- **Admin:** Create students, link students to parent accounts, view all users and students

## User preferences

- Code should feel like a "talented beginner" wrote it — clear and functional, not over-abstracted
- Single routes file style for backend (consolidated into one barrel)
- Keep CSS in global file / use basic Tailwind classes

## Gotchas

- After schema changes: run `pnpm --filter @workspace/db run push` then `pnpm --filter @workspace/api-spec run codegen`
- `bcryptjs` and `jsonwebtoken` must stay in `dependencies` (not devDependencies) in api-server
- `lib/api-client-react/package.json` exports `./custom-fetch` so frontend can import `setAuthTokenGetter`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
