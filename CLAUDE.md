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

### Authentication
- Whole app is behind a login (name `ryo`/`madoka` + a random anniversary question answered as 8-digit `YYYYMMDD`). `proxy.ts` (Next 16's renamed middleware) verifies the signed `session` cookie; pages redirect to `/login`, `/api/*` returns 401. `/api/cron/*` and `/login` are excluded from the matcher (cron routes authenticate themselves with `CRON_SECRET`).
- Tokens are HMAC-SHA256 signed with `node:crypto` (no JWT lib) — `lib/auth/token.ts`; sessions last 7 days. `SESSION_SECRET` (≥32 chars) is required; a missing/short secret fails closed.
- Questions and answers live only in the `LOGIN_QUESTIONS` env var (JSON, see `.env.example`) and are checked server-side in `app/(auth)/login/actions.ts`; never put real answers in the repo. 5 wrong answers per name lock login for 15 min (`LoginAttempt` table, `lib/auth/lockout.ts`). The "◯◯に通知されます" warning is display-only — nothing is actually sent.
- Pages live in the `app/(app)/` route group (header + bottom nav layout); the login page is in `app/(auth)/`.

### Receipt scanning (`/receipt`)
- Photo of a receipt → `POST /api/receipt/scan` (`app/api/receipt/scan/route.ts`) → Gemini API (`lib/gemini.ts`, plain `fetch` to `generateContent`, key in `GEMINI_API_KEY`, model via optional `GEMINI_MODEL`) → food candidates → user reviews/edits/discards in `components/ReceiptScanner.tsx` → registered one by one through the existing `POST /api/foods` with expiry = registration day + 7 days. Images are never stored.
- The client downsizes photos first (`lib/resizeImage.ts`) to stay under Vercel's 4.5MB request limit. Model output is untrusted: always pass it through `sanitizeItems` (`lib/receipt.ts`). Free-tier Gemini content may be used by Google to improve its products.

### Cron jobs (`vercel.json`, Bearer `CRON_SECRET` auth)
- `/api/cron/notify` (daily 00:00 UTC = 09:00 JST): Slack notification for foods expiring tomorrow, via `lib/slack.ts`; uses `Food.notified` to avoid repeats.
- `/api/cron/monthly-expenses` (1st of month): materialises active `RecurringExpense` rows into `Expense` rows (`isFixed: true`, dated the 1st), skipping ones that already exist for that month.

### CI
`.github/workflows/auto-implement.yml` runs Claude Code on newly opened GitHub issues, creating an `issue-<n>` branch and PR.
