# School Record Keeping System

Standalone record-keeping system for schools. Built as a separate project (separate repo) so it can evolve independently and its module logic can be lifted into the main School MS later.

- **Backend:** Node.js + Express + Prisma + PostgreSQL
- **Scope:** record keeping only (inventory, PTA/printing ledger, library, visits, incidents, IGF, enrolment, achievements)

## Modules

| Area | Route prefix | Notes |
|------|-------------|-------|
| Auth | `/api/auth` | Login + current user |
| Inventory | `/api/inventory` | S/N, name, quantity, source |
| Class Ledger | `/api/ledger` | PTA + Printing (typed, per-class, T1/T2/T3 + amount owing) |
| Library | `/api/library` | Student + teacher loans (RED/BLUE derived) |
| Visits | `/api/visitors` | Visitor log |
| Incidents | `/api/incidents` | Student + teacher daily reports |
| IGF | `/api/igf` | Worship + Canteen income, School Projects |
| Classes | `/api/classes` | KG1 … B9 grouping |
| Enrolment | `/api/enrollment` | Student roster by class + teacher roster |
| Achievements | `/api/achievements` | Aggregated PTA + IGF |

## Setup

```bash
npm install
# create .env from .env.example (set DATABASE_URL)
npx prisma migrate dev --name init   # or: npx prisma db push
npx prisma generate
npm run db:seed                       # creates demo school + admin
npm run dev
```

Server runs on **http://localhost:5001** · Health check: `GET /api/health`

Default admin: `admin@school.com` / `Admin@1234` (only if seeded).
