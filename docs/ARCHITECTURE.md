# HerdSync Architecture

## Application boundaries

HerdSync is a Next.js App Router application backed by PostgreSQL.

- `src/app`: pages, route layouts, and HTTP API handlers
- `src/components/layout`: application-wide shells and navigation
- `src/components/ui`: reusable presentation primitives
- `src/lib`: server utilities, authentication, database access, and audit logging
- `database`: canonical PostgreSQL schema
- `scripts`: one-off administration, migration, seed, and verification commands
- `public`: static images and web assets

## Routes

| URL | Source | Purpose |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Public landing page |
| `/login` | `src/app/login/page.tsx` | Authentication |
| `/dashboard` | `src/app/dashboard/page.tsx` | Farm overview |
| `/livestock` | `src/app/livestock/page.tsx` | Cattle records |
| `/health` | `src/app/health/page.tsx` | Health records |
| `/api/auth/*` | `src/app/api/auth` | Session lifecycle |
| `/api/dashboard` | `src/app/api/dashboard/route.ts` | Dashboard aggregates |
| `/api/livestock/*` | `src/app/api/livestock` | Livestock CRUD |
| `/api/health/*` | `src/app/api/health` | Health-record CRUD |

Next.js owns routing. Folder names under `src/app` are URL segments. Dynamic IDs use `[id]` folders. Do not rename route folders without updating navigation, redirects, tests, and documentation.

## Dependency direction

1. Pages and route handlers may import `components` and `lib`.
2. Components may import `components/ui` and framework packages.
3. `lib` must not import pages or components.
4. API handlers own trust-boundary validation and authorization.
5. PostgreSQL constraints protect persistent data integrity.

## Naming conventions

- React components: kebab-case filenames, PascalCase exports
- Utilities: kebab-case filenames, camelCase exports
- App Router files: Next.js reserved names (`page.tsx`, `layout.tsx`, `route.ts`)
- SQL: lowercase snake_case identifiers
- Scripts: verb-first kebab-case names

## Current inventory baseline

Inventory report dated August 31, 2025 records 25 cattle on hand:

- Bulls: 2
- Yearling bull: 1
- Cows: 11
- Heifers: 8
- Calves: 3

Previous balance was 29; four yearling bulls were deducted, producing a 14% decrease after rounding.

## Change checklist

Before merging:

1. Run `npm run check`.
2. Verify new API routes require authentication where applicable.
3. Update `database/schema.sql` for schema changes and add a repeatable migration script when existing databases need alteration.
4. Update this route table for new user-facing routes.
5. Never commit `.env.local`, credentials, `.next`, or `node_modules`.
