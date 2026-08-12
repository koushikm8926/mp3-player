# Minax Music — Admin Panel

Web administration for the Minax Music Android application, plus the API the app talks to.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 and Prisma 7 over
SQLite.

## Setup

```bash
npm install
npm run setup     # prisma generate + db push + seed
npm run dev       # http://localhost:3000
```

Default credentials come from `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), by default:

```
admin@minaxdigital.com  /  Admin@12345
```

**Change `AUTH_SECRET` and the admin password before deploying anywhere.**

Add sample data so the dashboard is populated:

```bash
npx tsx prisma/seed.ts --demo
```

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server bound to `0.0.0.0` (reachable from a phone on the same network) |
| `npm run build` / `npm start` | Production build and server |
| `npm run setup` | Generate the client, create the database, seed it |
| `npm run db:push` | Apply schema changes to the database |
| `npm run db:seed` | Re-seed admin, settings and version rows (idempotent) |
| `npm run db:studio` | Prisma Studio database browser |

## Pages

| Route | Purpose |
| ----- | ------- |
| `/login` | Secure admin sign-in |
| `/` | Dashboard — user counts, signup chart, version spread, newest users |
| `/users` | Registered users with search, status/type filters, sorting, pagination |
| `/users/[id]` | User details, devices, activity breakdown, suspend/delete/revoke |
| `/active` | Active users, DAU/WAU/MAU, stickiness, hourly check-ins |
| `/statistics` | Signup cohorts, retention, engagement distribution, top listeners |
| `/reports` | Period reports with CSV export |
| `/versions` | App version management |
| `/settings` | Settings management, password change, audit log |

## API

Mobile endpoints live under `/api/mobile/*` and CSV exports under `/api/reports/*`.
Full reference: [`../docs/API.md`](../docs/API.md).

## Structure

```
src/
  app/
    (dashboard)/     server-rendered admin pages + their server actions
    login/           sign-in page and auth actions
    api/mobile/      endpoints the Android app calls
    api/reports/     CSV exports
  components/        shared UI and client islands
  lib/
    auth.ts          admin JWT + mobile bearer tokens + audit helper
    prisma.ts        Prisma singleton (driver adapter)
    mobile.ts        shared validation and device upsert for mobile routes
    settings.ts      typed settings access
    format.ts        number, date and CSV formatting
  generated/prisma/  Prisma client output (generated, not edited)
prisma/
  schema.prisma      data model
  seed.ts            first admin, default settings, initial version, --demo data
prisma.config.ts     Prisma 7 config (holds the datasource URL)
```
