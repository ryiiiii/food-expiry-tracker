# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev            # dev server (http://localhost:3000)
npm run build          # prisma generate && next build
npm run lint           # ESLint (flat config, eslint-config-next)
npx prisma migrate dev # apply/create migrations (needs DATABASE_URL)
npx prisma studio      # DB browser
```

There is no test suite. Copy `.env.example` to `.env.local` for local setup (`DATABASE_URL="file:./dev.db"`, `SLACK_WEBHOOK_URL`, `CRON_SECRET`).

## Architecture

Japanese-language household app (Next.js 16 App Router, React 19, Tailwind v4, Prisma 7) with three areas, each a page that renders a single client component which fetches from its own API routes:

- `/` → `components/FoodList` ↔ `app/api/foods/*` (food expiry tracking; `foods/names` backs name autocomplete from the `FoodName` history table, which intentionally survives food deletion)
- `/shopping` → `components/ShoppingList` ↔ `app/api/shopping/*` (incl. `suggestions`)
- `/accounting` → `components/ExpenseList`/`ExpenseForm` ↔ `app/api/expenses/*` (incl. `repayment` for the cumulative loan-repayment total)

Pages are thin server components; all state/UI lives in `"use client"` components under `components/`, and they call the API routes with `fetch`. Import alias is `@/`.

### Database
- Prisma with the `prisma-client-js` generator and the **libsql driver adapter** (`lib/prisma.ts`): local SQLite file (`dev.db`) in dev, Turso (`libsql://` + `DATABASE_AUTH_TOKEN`) in production. Always import the shared `prisma` singleton from `@/lib/prisma`.
- Schema in `prisma/schema.prisma`; enum-like fields (`expiryType`, `Expense.category`, `payer`) are plain strings whose allowed values are documented in schema comments and duplicated in the form components.

### Cron jobs (`vercel.json`, Bearer `CRON_SECRET` auth)
- `/api/cron/notify` (daily 00:00 UTC = 09:00 JST): Slack notification for foods expiring tomorrow, via `lib/slack.ts`; uses `Food.notified` to avoid repeats.
- `/api/cron/monthly-expenses` (1st of month): materialises active `RecurringExpense` rows into `Expense` rows (`isFixed: true`, dated the 1st), skipping ones that already exist for that month.

### CI
`.github/workflows/auto-implement.yml` runs Claude Code on newly opened GitHub issues, creating an `issue-<n>` branch and PR.
