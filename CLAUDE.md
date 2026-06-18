# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product overview

This is an event registration & check-in platform built for **social-dance organizers** (Bachata /
Salsa / Zouk parties, workshops, and festivals). It replaces the common but painful workflow of
collecting sign-ups in a Google Form and printing an A4 Excel sheet to check people off at the door.

What it does well, and why each piece exists:

- **Tiered pricing** (早鳥 / 一般 / 現場) — dance events almost always sell early-bird, regular, and
  door prices. Tiers are time-based (`eventPriceTiers`, the `endsAt = null` tier is the door/fallback
  price); each ticket can carry a per-tier price. Prices are resolved server-side at registration
  time so the charged amount can't drift from what was shown.
- **Ticket groups, multi-select & mutual exclusion** — Full-Pass vs single-class vs party add-ons,
  with rules like "pick one of these" or "choosing a Full-Pass locks the single-class group."
- **Leader / Follower stats** — every attendee has a dance role, which organizers need for balance.
- **Payment tracking** (`pending → reported → confirmed | rejected`) — attendees upload a transfer
  screenshot at `/report-payment/[registrationKey]`; organizers confirm and an email goes out.
- **QR check-in** — the standout feature at the door. Attendees show a QR voucher; staff scan it at
  `/events/[eventId]/scan` and mark each attendee checked in, replacing the printed paper list.
- **On-site (walk-in / cash) registration** — organizers can register someone who shows up at the
  door, charge cash, and check them in on the spot, from a phone. See the walk-in endpoint
  `app/api/events/[eventId]/registrations/walk-in/route.ts` and `WalkInDrawer`.

Public-facing pages use opaque `publicKey` / `registrationKey` (nanoid) URLs and need no login;
organizer dashboards are team-scoped and JWT-authenticated.

## Commands

```bash
npm run dev          # Start dev server (Next.js with Turbopack)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate      # Generate migration SQL from schema changes (does not touch any DB)
npm run db:migrate       # Apply migrations to LOCAL DB (reads .env)
npm run db:migrate:local # Apply migrations to LOCAL DB (explicit alias)
npm run db:studio        # Open Drizzle Studio against LOCAL DB
npm run db:studio:local  # Open Drizzle Studio against LOCAL DB (explicit alias)
npm run db:migrate:prod  # ⚠️ Apply migrations to PRODUCTION (reads .env.production)
npm run db:studio:prod   # Open Drizzle Studio against PRODUCTION (reads .env.production)
```

### Database environments — local vs production

Environments are separated by **file**, never by commenting URLs in and out:

- `.env` holds the **local** `DATABASE_URL` only. It must never contain the production URL.
- `.env.production` holds the **production** `DATABASE_URL` only.

`drizzle.config.ts` loads `.env` by default; the `:prod` scripts use `dotenv -e .env.production` to override it. SSL is derived from the connection string (local = off, production URL carries `?sslmode=require`), and every `drizzle-kit` run prints `[drizzle] target = LOCAL | REMOTE / PRODUCTION (host)` so the target is visible before anything is applied.

**Rule: any command NOT ending in `:prod` only ever touches the local DB.** Only the `:prod` scripts read `.env.production`. Typical flow: edit `db/schema.ts` → `db:generate` → `db:migrate:local` to verify → `db:migrate:prod` once confirmed.

### Local database

```bash
docker compose up -d  # Start local Postgres on port 54331
```

Local `DATABASE_URL` (already set in `.env`): `postgresql://postgres:password@localhost:54331/postgres`.

## Architecture

**Next.js 16 App Router** — all routes live under `app/`.

### Route structure

| Path | Purpose |
|------|---------|
| `app/events/` | Authenticated organizer dashboard — list, create, manage events |
| `app/events/[eventId]/` | Event detail + registrations management |
| `app/events/[eventId]/scan/` | QR code check-in scanner |
| `app/e/[publicKey]/` | Public event registration page (no auth required) |
| `app/entry-voucher/[registrationKey]/` | QR voucher shown to attendees |
| `app/report-payment/[registrationKey]/` | Payment upload page for attendees |
| `app/registration-success/[registrationKey]/` | Post-registration confirmation |
| `app/teams/` | Team management |
| `app/api/` | REST API routes |

### Authentication

Custom JWT auth using `jose` + `bcryptjs`. Session stored in an `httpOnly` cookie (`auth_token`, 7-day TTL). No NextAuth.

- `lib/auth.ts` — token creation/verification, cookie helpers, `getSession()`
- `lib/api-auth.ts` — `requireAuth()` and `requireTeamMember()` guards used in API routes

All API routes that require authentication call `requireAuth()` first, then `requireTeamMember()` to enforce team-scoped access.

### Database

Drizzle ORM + PostgreSQL (Neon in production). Schema defined in `db/schema.ts`.

Key relationships:
- **Users ↔ Teams** — many-to-many via `teamMembers` (roles: `owner`, `member`)
- **Teams → Events** — a team owns many events
- **Events → EventRegistrations** — registrations are scoped to events
- **EventRegistrations → EventAttendees** — each registration has one or more attendees (dancers: `Leader`, `Follower`, `Not sure`)
- **Events → EventPurchaseItems** — ticket types/price options; can be `hidden` to preserve history without showing them in new registrations
- **Events → EventLocations / Organizers / BankInfos** — reusable team-level resources linked to events

Both `events` and `eventRegistrations` use opaque `publicKey`/`registrationKey` strings (nanoid) for public-facing URLs instead of numeric IDs.

Payment flow: `pending → reported → confirmed | rejected`. Attendees upload a payment screenshot at `/report-payment/[registrationKey]`, which triggers a Resend email to the organizer.

### Client-side data fetching

TanStack Query via `providers/QueryProvider.tsx`. API client functions live in `lib/api/`. The active team context (`useCurrentTeam` hook) is the root state: switching teams invalidates event queries.

### Components

- `components/ui/` — shadcn/ui primitives (added via `npx shadcn add <component>`)
- `components/layout/` — `AppShell`, `Header`, `Sidebar` for the authenticated dashboard
- `components/events/management/` — organizer-facing event editing UI
- `components/events/registration/` — public registration flow (multi-step form) and registration detail views

### File uploads

UploadThing (`lib/uploadthing.ts`, `app/api/uploadthing/`) handles image uploads for event covers, organizer photos, and payment screenshots.

### Email

Resend (`lib/email.ts`) sends two transactional emails: registration confirmation and payment confirmation. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and `SITE_URL` in environment.

## Environment variables

See `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET`, `UPLOADTHING_SECRET`, `RESEND_API_KEY`.
