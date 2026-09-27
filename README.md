# HerdSync

HerdSync is a cattle-management information system for the MSU-General Santos College of Agriculture Animal Science Farm. It centralizes livestock inventory, health and treatment records, breeding, pregnancy, calving, lineage, alerts, reports, user access, and audit history.

## Features

- Cattle registration, profiles, archiving, search, and filtering
- Weight, body-condition, growth, health, and treatment history
- Medicine inventory, treatment protocols, dosage schedules, and withdrawal tracking
- Breeding sessions, heat records, pregnancy monitoring, checkups, and calving outcomes
- Sire, dam, offspring, and lineage records
- Dashboard metrics, alerts, activity logs, and printable reports
- Role-based access for administrators, farm managers, veterinarians, farm aides, and faculty
- Secure server-side sessions, audit attribution, CSRF origin checks, and API rate limits
- Installable Progressive Web App for iOS, Android, and desktop
- Responsive interface with accessible reduced-motion behavior

## Technology

| Layer | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 and project CSS |
| Database | PostgreSQL with `pg` connection pooling |
| Charts | Recharts |
| 3D preview | Three.js, React Three Fiber, Drei |
| Icons and motion | Lucide React, Framer Motion |
| Authentication | Database-backed opaque sessions and Node.js `scrypt` password hashing |

## Requirements

- Node.js 20.9 or newer
- npm
- PostgreSQL 14 or newer
- `psql` recommended for schema and migration commands

## Local setup

1. Clone and enter repository:

   ```bash
   git clone https://github.com/0xJape/herdsync_capstone.git
   cd herdsync_capstone
   ```

2. Install exact dependency versions:

   ```bash
   npm ci
   ```

3. Copy environment template:

   **PowerShell**

   ```powershell
   Copy-Item .env.example .env.local
   ```

   **macOS/Linux**

   ```bash
   cp .env.example .env.local
   ```

4. Set local PostgreSQL connection in `.env.local`:

   ```dotenv
   DATABASE_URL="postgresql://postgres:your-password@localhost:5432/db_herdsync"
   ```

5. Create database and apply canonical schema:

   ```bash
   createdb db_herdsync
   psql "$DATABASE_URL" -f database/schema.sql
   ```

   On PowerShell, use connection string directly if `psql` does not expand `.env.local`:

   ```powershell
   psql "postgresql://postgres:your-password@localhost:5432/db_herdsync" -f database/schema.sql
   ```

6. Create first administrator. Replace placeholder values in `.env.local`, then run:

   ```bash
   node --env-file=.env.local scripts/create-admin.mjs
   ```

7. Start development server:

   ```bash
   npm run dev
   ```

8. Open <http://localhost:3000>.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection used by app and scripts |
| `APP_ORIGIN` | Behind a proxy | Public HTTPS origin used for CSRF validation, such as `https://herdsync.dotenvlabs.me` |
| `ADMIN_EMAIL` | Admin creation only | Initial administrator email |
| `ADMIN_PASSWORD` | Admin creation only | Initial administrator password; minimum 12 characters |
| `ADMIN_NAME` | Admin creation only | Initial administrator display name |

Never commit `.env.local`, credentials, database dumps containing real data, private keys, or tunnel credentials. `.env.local` is ignored by Git.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Turbopack development server |
| `npm run build` | Create production build |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run check` | Run lint, typecheck, and production build |
| `npm run create-admin` | Create administrator from exported environment variables |
| `npm run seed-demo` | Insert optional demonstration data |
| `npm run seed-lineage` | Insert optional lineage demonstration data |
| `npm run seed-pregnancies` | Insert optional pregnancy demonstration data |

Seed scripts are for development or demonstration databases. Review scripts before running them against shared data.

## Database changes

- `database/schema.sql` is canonical schema for a new database.
- `database/migrations/` contains ordered changes for existing databases.
- Apply only migrations not already applied to target database, in filename order.
- Back up shared or production data before every migration.
- Keep schema and migration changes in same commit.

Example migration:

```bash
psql "$DATABASE_URL" -f database/migrations/20260927_query_performance_indexes.sql
```

## Project structure

```text
database/                  PostgreSQL schema and migrations
docs/                      Architecture notes
public/                    Icons, PWA files, images, and 3D models
scripts/                   Admin, migration, seed, and verification scripts
src/app/                   App Router pages and API route handlers
src/components/            Shared application components
src/lib/                   Authentication, database, rules, and server utilities
src/proxy.ts               Route protection, CSRF checks, and API rate limiting
```

## Security model

- Passwords are salted and hashed with `scrypt`.
- Random session tokens are stored only as SHA-256 hashes in PostgreSQL.
- Session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Protected APIs enforce authentication and role authorization server-side.
- Mutating APIs reject cross-site browser requests.
- Security headers include CSP, clickjacking protection, MIME sniffing protection, and restrictive permissions policy.
- Login and API routes have process-local rate limits.

Process-local rate limiting protects one Node.js process only. Use Cloudflare rate limiting or shared Redis-backed limits when running multiple instances or when strict distributed enforcement is required.

## Progressive Web App

HerdSync includes a web manifest, install icons, loading screen, service worker, and public offline fallback.

- Android/Chromium installation uses browser install prompt.
- iOS installation uses Safari **Share → Add to Home Screen**.
- Service workers require HTTPS, except on localhost.
- Private herd records, API responses, authenticated pages, and redirects are not cached offline.
- Offline editing and synchronization are intentionally unsupported.

## Production run

```bash
npm ci
npm run build
npm start
```

Default port is `3000`. Override with platform-supported `PORT` configuration when needed. Put HTTPS reverse proxy or Cloudflare Tunnel in front of app; do not expose PostgreSQL publicly.

Before release:

1. Configure `DATABASE_URL` outside source control.
2. Apply pending migrations and verify backup restoration.
3. Run `npm run check`.
4. Create or verify administrator account.
5. Test login, role restrictions, writes, reports, PWA assets, and logout through public HTTPS hostname.
6. Confirm Cloudflare and application security headers coexist.
7. Monitor application and tunnel logs.

## Cloudflare Tunnel preview plan

For initial preview deployment, keep Next.js and PostgreSQL on trusted host and expose only Next.js port through named Cloudflare Tunnel:

```text
Internet → Cloudflare DNS/HTTPS → Cloudflare Tunnel → localhost:3000 → HerdSync → private PostgreSQL
```

Recommended controls:

- Use named tunnel, not temporary Quick Tunnel, for stable hostname.
- Store tunnel token outside repository.
- Route one dedicated hostname to `http://localhost:3000`.
- Keep PostgreSQL bound to localhost/private network.
- Enable Cloudflare Access during private testing.
- Disable caching for authenticated HTML and `/api/*`.
- Add Cloudflare rate-limit rules for `/api/auth/login` and sensitive APIs.
- Run app with production build, process supervisor, and automatic restart.
- Validate forwarded HTTPS origin against existing CSRF protection before launch.

Detailed tunnel commands and DNS choices should be finalized after deployment host, domain, operating system, PostgreSQL location, and public/private access policy are selected.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application boundaries and route conventions
- [`database/README.md`](database/README.md) — database workflow
- [`progress-details.md`](progress-details.md) — implementation history and current progress

## Contributing

1. Create feature branch.
2. Keep changes focused and preserve server-side authorization.
3. Add repeatable migration for persistent schema changes.
4. Run `npm run check`.
5. Open pull request describing behavior, database impact, and validation performed.

## License

No open-source license is currently declared. Treat repository as all rights reserved until project owners add one.
