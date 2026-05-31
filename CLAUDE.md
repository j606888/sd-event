# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js with Turbopack)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate  # Generate Drizzle migration from schema changes
npm run db:migrate   # Run migrations (uses .env)
npm run db:studio    # Open Drizzle Studio (DB browser)
npm run db:migrate:prod  # Run migrations against .env.production
```

### Local database

```bash
docker compose up -d  # Start local Postgres on port 54331
```

Set `DATABASE_URL=postgresql://postgres:password@localhost:54331/postgres` in `.env`.

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
