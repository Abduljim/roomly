# Roomly

Shared bill-tracking app for roommates — automatically calculates who owes whom each month.

## Stack
- **Frontend:** React (Vite) + TypeScript + Tailwind CSS (`client/`)
- **Backend:** Express + TypeScript (`server/`)
- **Database:** PostgreSQL 16 (Docker) with Prisma ORM
- **Auth:** bcrypt + JWT in httpOnly cookies
- **Jobs:** node-cron (monthly cycle generation + due-date reminders)

## Quick start

1. **Start PostgreSQL** (Docker):
   ```
   docker compose up -d
   ```
   Creates a `roomly` database with user/password `roomly` on port 5432 (data persisted in a Docker volume).

2. **Backend**:
   ```
   cd server
   npm install
   npx prisma migrate dev     # apply schema
   npm run dev                # http://localhost:4000
   ```

3. **Frontend**:
   ```
   cd client
   npm install
   npm run dev                # http://localhost:5173
   ```

4. **Verify everything works**:
   ```
   cd server
   npm test                   # unit + integration tests (12 tests)
   node scripts/smoke.mjs     # end-to-end API smoke test (server must be running)
   ```

## Notes
- Money amounts use Postgres `Decimal(12,2)`; month periods (`period_month`, `settlement_month`) are `Date` columns. App code uses `"YYYY-MM-01"` string keys and converts at the Prisma boundary via `toMonthDate()` in `server/src/services/settlement-core.ts`.
- Schema uses native Postgres enums: `Role`, `Recurrence`, `Category`, `SplitType`, `PaymentStatus`, `NotificationType`.
- Email is stubbed with console.log in dev (`server/src/utils/email.ts`) — swap in Resend/Postmark there.
- The old SQLite `dev.db` is no longer used and can be deleted.
