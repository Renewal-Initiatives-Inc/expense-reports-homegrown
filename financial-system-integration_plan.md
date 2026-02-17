# Financial System Integration — Plan

**Status:** Ready to Build (Discovery Complete)
**Last Updated:** 2026-02-17
**Author:** Jeff + Claude
**Traces to:** INT-P0-001, INT-P0-004, INT-P0-005, INT-P0-008, INT-P0-009, D-007, D-118, D-122

> **Protocol**: Start new sessions with: `@financial-system-integration_plan.md Continue.`

---

## 1. Problem Statement

expense-reports-homegrown currently syncs categories/projects from QuickBooks Online but never writes financial data back. It needs to: (a) deprecate all QBO integration, (b) read GL accounts and funds from financial-system's Neon DB, (c) INSERT staging records on approval so financial-system can create GL entries and track payments, and (d) read status back for user visibility.

---

## 2. What Exists Today

| Layer | What's There | Key Files |
|-------|-------------|-----------|
| Framework | Next.js 16 App Router, React 19 | `src/app/` |
| DB/ORM | Drizzle + Neon Postgres (serverless) | `src/lib/db/index.ts`, `src/lib/db/schema/` |
| Auth | NextAuth v5 + Zitadel OIDC (PKCE) | `src/lib/auth.ts`, `src/middleware.ts` |
| QBO integration | OAuth flow, category/project sync, encrypted token storage | `src/lib/qbo/`, `src/app/api/qbo/` |
| Receipt AI | Claude Sonnet 4 extraction (camera + email pipeline) | `src/lib/receipt-extraction.ts`, `src/lib/anthropic.ts` |
| Mileage | Google Maps distance calc + IRS rate from settings table | `src/lib/google-maps/`, `src/app/api/distance/` |
| File storage | Vercel Blob (receipts) | `src/lib/blob.ts` |
| Schema | 8 tables: `expense_reports`, `expenses`, `users`, `qbo_tokens`, `qbo_cache`, `settings`, `notifications`, `user_emails` | `src/lib/db/schema/` |
| Approval flow | open → submitted → approved/rejected, admin reviews | `src/app/api/admin/reports/` |
| "Projects" | QBO Classes mapped as cost centers, optional per expense | `src/hooks/use-projects.ts`, expense form |

**What does NOT exist yet:**
- No connection to financial-system DB
- No fund or GL account selection (only QBO categories/projects)
- No staging record writes on approval
- No status read-back from financial-system
- No IRS compliance validations (60-day rule, receipt thresholds)

---

## 3. Architecture

```
                    ┌─────────────────┐
                    │ financial-system │
                    │  (Neon Postgres) │
                    │                  │
                    │  funds (ref)     │
                    │  accounts (ref)  │
                    │  staging_records │
                    └────────┬────────┘
                             │ expense_reports_role
                             │ (SELECT funds, accounts;
                             │  INSERT+SELECT staging_records)
                             │
┌────────────────────────────┴───────────────────────────┐
│              expense-reports-homegrown                   │
│                                                          │
│  1. Cache funds + GL accounts locally                   │
│  2. User selects fund + GL account per expense line     │
│  3. IRS compliance checks on submit                     │
│  4. On approval → INSERT staging_records per line item  │
│  5. Read status back for user display                   │
│  6. QBO fully removed                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Design Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Replace QBO categories with GL accounts from financial-system `accounts` table | financial-system is source of truth for chart of accounts (Session 1) |
| D2 | Replace QBO "Projects" with `funds` from financial-system, rename to "Funding Source" | Per Session 1: "Projects" was a workaround for QBO Classes |
| D3 | Default fund = General Fund (Unrestricted) | Per D-024 in financial-system |
| D4 | GL account is **required** per expense line item | Per staging integration guide: `gl_account_id` NOT NULL for expense reports |
| D5 | Fund is **required** per expense line item | Per staging table FK constraint |
| D6 | One staging_records row per expense line item | Per Session 1: line-item granularity for independent GL account + fund attribution |
| D7 | Staging INSERT inside approval transaction | All lines succeed or none; errors surface to approver |
| D8 | Cache funds + accounts locally for dropdown rendering | Avoid cross-DB reads on every form render; sync on-demand or periodic |
| D9 | Clean QBO removal — no dual-write period | Per integration spec: clean cutover, historical data in QBO covered by FY25 migration |
| D10 | Add IRS accountable plan validations at submit time | Per discovery Session 6: 60-day rule, $75 receipt threshold, memo requirements |
| D11 | Use separate Drizzle instance for financial-system DB | Same pattern as renewal-timesheets: restricted Postgres role with minimal permissions |
| D12 | `source_record_id` format: `er_{reportId}_line_{expenseId}` | Unique per line item; uses existing UUIDs for guaranteed uniqueness |
| D13 | `employee_id` = Zitadel `sub` (user ID from NextAuth session) | String identifier matching users table PK; no FK in staging_records |

---

## 5. Environment Variables

### Add

```bash
# Connection to financial-system Neon DB using expense_reports_role
FINANCIAL_SYSTEM_DATABASE_URL=postgres://expense_reports_role:<password>@<financial-system-neon-host>/financial_system?sslmode=require
```

### Remove (QBO deprecation)

```bash
QBO_ENVIRONMENT=        # remove
QBO_CLIENT_ID=          # remove
QBO_CLIENT_SECRET=      # remove
QBO_REDIRECT_URI=       # remove
QBO_ENCRYPTION_KEY=     # remove
```

---

## 6. Database Changes

### 6a. Add `fund_id` + `gl_account_id` to `expenses` table (migration)

```sql
ALTER TABLE expenses
  ADD COLUMN fund_id INTEGER,
  ADD COLUMN gl_account_id INTEGER;
-- Nullable during migration; new expenses will require both
-- Existing expenses keep NULL (pre-integration, already in QBO)
```

### 6b. Replace `project*` columns with `fund*` columns

```sql
-- Rename for clarity (or add new + deprecate old)
-- projectId → fundId (already handled by fund_id above)
-- projectName → fundName (for display cache)
ALTER TABLE expenses
  ADD COLUMN fund_name TEXT,
  ADD COLUMN gl_account_name TEXT;
-- Keep projectId/projectName temporarily for existing data, drop in future migration
```

### 6c. Add `reference_data_cache` table (replaces `qbo_cache`)

```sql
CREATE TABLE reference_data_cache (
  key       TEXT PRIMARY KEY,          -- 'funds' or 'accounts'
  data      JSONB NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP
);
```

### 6d. Add `staging_sync_status` table

```sql
CREATE TABLE staging_sync_status (
  id                SERIAL PRIMARY KEY,
  report_id         UUID NOT NULL REFERENCES expense_reports(id),
  expense_id        UUID NOT NULL REFERENCES expenses(id),
  source_record_id  VARCHAR(255) NOT NULL,
  fund_id           INTEGER NOT NULL,
  gl_account_id     INTEGER NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'received',
  synced_at         TIMESTAMP NOT NULL DEFAULT now(),
  last_checked_at   TIMESTAMP,
  UNIQUE(report_id, expense_id)
);
```

### 6e. Drop QBO tables (after QBO removal is complete)

```sql
DROP TABLE IF EXISTS qbo_tokens;
DROP TABLE IF EXISTS qbo_cache;
```

---

## 7. External Tables (via `expense_reports_role`)

### 7a. financial-system `funds` table (SELECT only)

| Column | Type | Used For |
|--------|------|----------|
| `id` | integer PK | FK value for staging_records.fund_id |
| `name` | varchar | Display in dropdown |
| `restriction` | varchar | Display label (Unrestricted, Temporarily Restricted, etc.) |
| `is_active` | boolean | Filter inactive funds |

### 7b. financial-system `accounts` table (SELECT only)

| Column | Type | Used For |
|--------|------|----------|
| `id` | integer PK | FK value for staging_records.gl_account_id |
| `code` | varchar | Display in dropdown (e.g., "5010") |
| `name` | varchar | Display in dropdown (e.g., "Office Supplies") |
| `type` | varchar | Filter to `type = 'EXPENSE'` only |
| `is_active` | boolean | Filter inactive accounts |

### 7c. financial-system `staging_records` table (INSERT + SELECT)

| Column | Type | Source in expense-reports |
|--------|------|-----------------------------|
| `source_app` | varchar(50) | Always `'expense_reports'` |
| `source_record_id` | varchar(255) | `er_{reportId}_line_{expenseId}` |
| `record_type` | varchar(50) | Always `'expense_line_item'` |
| `employee_id` | varchar(255) | User's Zitadel `sub` (session user ID) |
| `reference_id` | varchar(255) | Expense report ID (UUID) |
| `date_incurred` | date | Expense date |
| `amount` | numeric(12,2) | Expense amount |
| `fund_id` | integer (FK → funds) | User-selected funding source |
| `gl_account_id` | integer (FK → accounts) | User-selected GL account |
| `metadata` | jsonb | See §7d below |
| `status` | varchar(20) | Always `'received'` on INSERT |

### 7d. Metadata JSONB shape

**Out-of-pocket:**
```json
{
  "merchant": "Home Depot",
  "memo": "Construction supplies for barn renovation",
  "expenseType": "out_of_pocket"
}
```

**Mileage:**
```json
{
  "merchant": "Mileage Reimbursement",
  "memo": "Site visit to Easthampton property",
  "expenseType": "mileage",
  "mileageDetails": {
    "miles": 45.2,
    "rate": 0.67,
    "origin": "Springfield office",
    "destination": "75 Oliver St, Easthampton"
  }
}
```

---

## 8. Implementation Plan

### Phase 1: QBO Deprecation

Remove all QuickBooks Online code and dependencies. This unblocks the rest of the integration work by simplifying the codebase.

| Task | Status | Notes |
|------|--------|-------|
| Remove `intuit-oauth` dependency from `package.json` | 🔲 | |
| Remove `crypto-js` dependency (only used for QBO token encryption) | 🔲 | Verify no other usage first |
| Delete `src/lib/qbo/` directory (client, encryption, service, types) | 🔲 | 4 files |
| Delete `src/app/api/qbo/` directory (auth, callback, status, sync, categories, projects, disconnect, debug) | 🔲 | All QBO API routes |
| Delete `src/components/admin/QboConnectionCard.tsx` | 🔲 | |
| Delete `src/components/admin/QboSyncButton.tsx` | 🔲 | |
| Delete `src/components/admin/QboCacheStatus.tsx` | 🔲 | |
| Remove QBO references from admin settings page | 🔲 | `/admin/settings` and `/admin/qbo` pages |
| Delete `src/lib/db/queries/qbo-cache.ts` and `src/lib/db/queries/qbo-tokens.ts` | 🔲 | |
| Delete `src/lib/db/schema/qbo-cache.ts` and `src/lib/db/schema/qbo-tokens.ts` | 🔲 | |
| Remove QBO env vars from `.env.example` | 🔲 | `QBO_*` vars |
| Delete `src/hooks/use-categories.ts` (QBO categories hook) | 🔲 | Will be replaced by GL accounts hook |
| Delete `src/hooks/use-projects.ts` (QBO projects hook) | 🔲 | Will be replaced by funds hook |
| Remove fallback categories list from `src/lib/categories.ts` | 🔲 | No longer needed |
| Update `src/lib/receipt-extraction.ts` to remove QBO category matching | 🔲 | AI extraction will suggest GL account name instead |
| Run build to verify clean compilation | 🔲 | |

### Phase 2: Cross-DB Infrastructure

Set up the Drizzle connection to financial-system's Neon DB and define external table schemas.

| Task | Status | Notes |
|------|--------|-------|
| Create `src/lib/db/financial-system.ts` — Drizzle client for financial-system DB | 🔲 | Uses `FINANCIAL_SYSTEM_DATABASE_URL`, `@neondatabase/serverless` |
| Define external table schemas: `funds`, `accounts`, `staging_records` | 🔲 | Read-only type defs for funds/accounts; INSERT schema for staging_records |
| Add `FINANCIAL_SYSTEM_DATABASE_URL` to `.env.example` | 🔲 | |
| Add Zod validation for staging record INSERT payload | 🔲 | Match financial-system's expected shape |
| Verify connection works with `expense_reports_role` credentials | 🔲 | SELECT from funds, accounts; INSERT test to staging_records |

### Phase 3: Reference Data Caching

Replace QBO cache with financial-system reference data cache for funds and GL accounts.

| Task | Status | Notes |
|------|--------|-------|
| Create Drizzle migration: `reference_data_cache` table | 🔲 | Replaces `qbo_cache` |
| Create Drizzle migration: drop `qbo_tokens` and `qbo_cache` tables | 🔲 | |
| Create `src/lib/db/queries/reference-data.ts` — cache read/write queries | 🔲 | |
| Create `src/lib/reference-data/sync.ts` — fetch funds + accounts from financial-system | 🔲 | SELECT from funds (active), accounts (active, type=EXPENSE) |
| Create `GET /api/reference-data/funds` — return cached funds | 🔲 | |
| Create `GET /api/reference-data/accounts` — return cached GL accounts | 🔲 | |
| Create `POST /api/reference-data/sync` — admin trigger to refresh cache | 🔲 | |
| Create `src/hooks/use-funds.ts` — SWR hook for fund dropdown | 🔲 | Replaces `use-projects.ts` |
| Create `src/hooks/use-gl-accounts.ts` — SWR hook for GL account dropdown | 🔲 | Replaces `use-categories.ts` |

### Phase 4: Schema Migration + Expense Form Updates

Add fund and GL account fields to expenses, update forms.

| Task | Status | Notes |
|------|--------|-------|
| Create Drizzle migration: add `fund_id`, `gl_account_id`, `fund_name`, `gl_account_name` to `expenses` | 🔲 | Nullable for existing data |
| Update `src/lib/db/schema/expenses.ts` with new columns | 🔲 | |
| Update `src/types/expenses.ts` with new fields | 🔲 | |
| Update Zod validation in `src/lib/validations/` — require fund + GL account for new expenses | 🔲 | |
| Rename "Project" → "Funding Source" in `ExpenseForm.tsx` | 🔲 | Label, placeholder, validation messages |
| Replace project dropdown with fund dropdown (from `use-funds.ts`) | 🔲 | Default to General Fund |
| Add GL account dropdown to `ExpenseForm.tsx` | 🔲 | Required field, searchable dropdown |
| Rename "Project" → "Funding Source" in `MileageExpenseForm.tsx` | 🔲 | Same changes as ExpenseForm |
| Replace project dropdown with fund dropdown in `MileageExpenseForm.tsx` | 🔲 | |
| Add GL account dropdown to `MileageExpenseForm.tsx` | 🔲 | Pre-select "Travel/Mileage" account if one exists |
| Remove `billable` checkbox (QBO concept, not relevant to fund accounting) | 🔲 | |
| Update expense list/detail views to show fund name + GL account | 🔲 | Column headers, detail display |
| Update admin review views to show fund + GL account per line | 🔲 | `/admin/approvals/[id]` page |
| Update receipt AI extraction to suggest GL account name (not QBO category) | 🔲 | Fuzzy-match against cached GL account names |
| Update `POST /api/reports/[id]/expenses` to accept + store fund/GL fields | 🔲 | |
| Update `PUT /api/reports/[id]/expenses/[expenseId]` to accept + store fund/GL fields | 🔲 | |

### Phase 5: IRS Compliance Validations

Add accountable plan compliance checks at submit time (per discovery Session 6).

| Task | Status | Notes |
|------|--------|-------|
| Create `src/lib/validations/compliance.ts` — IRS validation rules | 🔲 | |
| Rule: Block submit if any line item date > 60 days old | 🔲 | IRS Publication 463 accountable plan |
| Rule: Require receipt for expenses >= $75 (except mileage) | 🔲 | `receiptUrl` must be non-null |
| Rule: Always require receipt for lodging regardless of amount | 🔲 | Need to identify lodging by GL account or category |
| Rule: If >= $75 and no receipt, require extended memo (min 20 chars) | 🔲 | Explain why receipt is missing |
| Rule: Memo required for all expense lines (min 10 chars) | 🔲 | Can't just repeat merchant name |
| Display current IRS mileage rate as helper text on mileage form | 🔲 | Already have rate in settings table |
| Integrate compliance checks into `POST /api/reports/[id]/submit` | 🔲 | Return violations array, block submit if any fail |
| Show compliance violations in UI before submit | 🔲 | Red warning list on report detail page |

### Phase 6: Staging Record Submission

On approval, INSERT staging_records into financial-system's DB.

| Task | Status | Notes |
|------|--------|-------|
| Create Drizzle migration: `staging_sync_status` table | 🔲 | Local tracking |
| Create `src/lib/staging/submit.ts` — aggregate + INSERT logic | 🔲 | |
| Build staging_records rows: one per expense line item | 🔲 | Map expense fields → staging schema |
| Generate `source_record_id` as `er_{reportId}_line_{expenseId}` | 🔲 | |
| Build metadata JSONB per expense type (out_of_pocket vs mileage) | 🔲 | See §7d |
| INSERT all rows in a single DB transaction | 🔲 | All succeed or none |
| Write local `staging_sync_status` records | 🔲 | Mirror what was sent |
| Handle FK errors: invalid fund_id → clear message to approver | 🔲 | "Fund X no longer exists in financial system" |
| Handle FK errors: invalid gl_account_id → clear message to approver | 🔲 | "GL Account Y no longer exists in financial system" |
| Handle unique constraint: `(source_app, source_record_id)` → treat as idempotent success | 🔲 | Already submitted, safe to continue |
| Hook into `POST /api/admin/reports/[id]/approve` | 🔲 | Staging INSERT happens after status change, inside try/catch |
| If staging INSERT fails: roll back approval, surface error to admin | 🔲 | Admin can retry or fix data |

### Phase 7: Status Read-Back

Read staging_records status from financial-system for user-facing display.

| Task | Status | Notes |
|------|--------|-------|
| Create `src/lib/staging/status.ts` — read status from financial-system | 🔲 | SELECT WHERE source_app='expense_reports' AND reference_id=reportId |
| Create `GET /api/reports/[id]/financial-status` | 🔲 | Returns per-line status array |
| Sync status to local `staging_sync_status` table | 🔲 | Avoids cross-DB read on every page load |
| Add status badges to report detail page | 🔲 | `received` → `posted` → `matched_to_payment` → `paid` |
| Add financial status column to reports list page | 🔲 | Summary: "3/5 posted", "All paid", etc. |
| Map status values to user-friendly labels | 🔲 | `received` = "Submitted", `posted` = "Posted to GL", `matched_to_payment` = "Payment Matched", `paid` = "Paid" |

### Phase 8: Cleanup + Polish

| Task | Status | Notes |
|------|--------|-------|
| Remove dead QBO imports/references across codebase | 🔲 | Grep for `qbo`, `intuit`, `QuickBooks` |
| Remove `/admin/qbo` page entirely | 🔲 | |
| Update `/admin/settings` page — remove QBO section, add "Sync Reference Data" button | 🔲 | |
| Update dashboard to show financial status summary | 🔲 | "N reports pending GL posting" etc. |
| Update `.env.example` with final env var list | 🔲 | |
| Update notification system: add `report_posted` notification type (optional) | 🔲 | Notify user when GL posting completes |
| Run full build + existing tests | 🔲 | |
| Manual E2E: create expense → submit → approve → verify staging record | 🔲 | |

---

## 9. Files to Create / Modify

### New Files

| File | Purpose |
|------|---------|
| `src/lib/db/financial-system.ts` | Drizzle client + external table schemas for financial-system |
| `src/lib/reference-data/sync.ts` | Fetch funds + accounts from financial-system → local cache |
| `src/lib/staging/submit.ts` | Build + INSERT staging_records on approval |
| `src/lib/staging/status.ts` | Read-back staging status from financial-system |
| `src/lib/validations/compliance.ts` | IRS accountable plan validation rules |
| `src/lib/db/queries/reference-data.ts` | Cache CRUD for reference data |
| `src/lib/db/schema/reference-data-cache.ts` | Drizzle schema for `reference_data_cache` table |
| `src/lib/db/schema/staging-sync-status.ts` | Drizzle schema for `staging_sync_status` table |
| `src/hooks/use-funds.ts` | SWR hook for fund dropdown (replaces `use-projects.ts`) |
| `src/hooks/use-gl-accounts.ts` | SWR hook for GL account dropdown (replaces `use-categories.ts`) |
| `src/app/api/reference-data/funds/route.ts` | GET cached funds |
| `src/app/api/reference-data/accounts/route.ts` | GET cached GL accounts |
| `src/app/api/reference-data/sync/route.ts` | POST admin-only cache refresh |
| `src/app/api/reports/[id]/financial-status/route.ts` | GET staging status for a report |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/db/schema/expenses.ts` | Add `fund_id`, `gl_account_id`, `fund_name`, `gl_account_name` columns |
| `src/types/expenses.ts` | Add fund + GL account fields to type definitions |
| `src/lib/validations/` | Update Zod schemas for fund + GL account; add compliance rules |
| `src/components/expenses/ExpenseForm.tsx` | Replace project dropdown → fund + GL account dropdowns |
| `src/components/expenses/MileageExpenseForm.tsx` | Same: fund + GL account dropdowns |
| `src/app/api/reports/[id]/expenses/route.ts` | Accept + store fund/GL fields |
| `src/app/api/reports/[id]/expenses/[expenseId]/route.ts` | Accept + store fund/GL fields |
| `src/app/api/reports/[id]/submit/route.ts` | Add IRS compliance checks before allowing submit |
| `src/app/api/admin/reports/[id]/approve/route.ts` | Add staging INSERT after approval |
| `src/lib/receipt-extraction.ts` | Replace QBO category matching with GL account name matching |
| `src/app/(protected)/reports/[id]/page.tsx` | Show fund + GL account per line; show financial status |
| `src/app/(protected)/admin/approvals/[id]/page.tsx` | Show fund + GL account in review; show staging errors |
| `src/app/(protected)/admin/settings/page.tsx` | Remove QBO section, add reference data sync |
| `src/app/(protected)/page.tsx` (dashboard) | Add financial status summary |
| `.env.example` | Add `FINANCIAL_SYSTEM_DATABASE_URL`, remove `QBO_*` vars |
| `package.json` | Remove `intuit-oauth`, `crypto-js`; no new deps needed |

### Deleted Files

| File | Reason |
|------|--------|
| `src/lib/qbo/` (entire directory) | QBO deprecation |
| `src/app/api/qbo/` (entire directory) | QBO deprecation |
| `src/components/admin/QboConnectionCard.tsx` | QBO deprecation |
| `src/components/admin/QboSyncButton.tsx` | QBO deprecation |
| `src/components/admin/QboCacheStatus.tsx` | QBO deprecation |
| `src/lib/db/queries/qbo-cache.ts` | QBO deprecation |
| `src/lib/db/queries/qbo-tokens.ts` | QBO deprecation |
| `src/lib/db/schema/qbo-cache.ts` | QBO deprecation |
| `src/lib/db/schema/qbo-tokens.ts` | QBO deprecation |
| `src/hooks/use-categories.ts` | Replaced by `use-gl-accounts.ts` |
| `src/hooks/use-projects.ts` | Replaced by `use-funds.ts` |
| `src/lib/categories.ts` | Fallback list no longer needed |
| `src/app/(protected)/admin/qbo/page.tsx` | QBO admin page |

---

## 10. Postgres Role (to be created on financial-system Neon DB)

```sql
-- Run in financial-system Neon console
CREATE ROLE expense_reports_role WITH LOGIN PASSWORD '...';

-- Read reference tables
GRANT SELECT ON accounts TO expense_reports_role;
GRANT SELECT ON funds TO expense_reports_role;

-- Write and read staging
GRANT INSERT, SELECT ON staging_records TO expense_reports_role;
GRANT USAGE ON SEQUENCE staging_records_id_seq TO expense_reports_role;

-- No UPDATE, no DELETE on anything
```

**Status:** ✅ Role exists and verified on production branch (2026-02-17)

---

## 11. Status Flow Reference

```
expense-reports-homegrown              financial-system
─────────────────────────              ────────────────
Admin approves report
  → INSERT staging_records ──────→  status: 'received'
     (one row per expense line)        │
                                     staging processor cron (every 15min)
                                       │
                                       ▼
  ← read status back ◄──────────  status: 'posted'
                                     (GL entry: DR expense account, CR 2010 Reimb Payable)
                                       │
                                     bank reconciliation
                                       │
                                       ▼
  ← read status back ◄──────────  status: 'matched_to_payment'
                                       │
                                     payment confirmed
                                       │
                                       ▼
  ← read status back ◄──────────  status: 'paid'
```

---

## 12. IRS Compliance Rules (Accountable Plan — Pub 463)

| Rule | Check | Enforcement |
|------|-------|-------------|
| 60-day rule | `expense.date` must be within 60 days of submit | Block submit with message per violation |
| $75 receipt threshold | Expenses >= $75 must have `receiptUrl` (except mileage) | Block submit |
| Lodging always needs receipt | Any expense with lodging GL account needs receipt, any amount | Block submit |
| Missing receipt memo | If >= $75 and no receipt: `memo` >= 20 chars explaining why | Block submit |
| Memo required | All expenses need `memo` >= 10 chars | Block submit |
| Memo quality | Memo can't just repeat merchant name | Warning (not blocking) |
| IRS mileage rate display | Show current rate as helper text on mileage form | Informational only |

---

## 13. Pre-Build Checklist (Jeff)

| Task | Status | Notes |
|------|--------|-------|
| Create `expense_reports_role` on financial-system Neon DB | ✅ | Already existed |
| Generate password for `expense_reports_role` | ✅ | Already set |
| Get financial-system Neon connection host | ✅ | `ep-misty-cake-aidno1i9-pooler.c-4.us-east-1.aws.neon.tech` |
| Build connection string | ✅ | Using pooler endpoint with `sslmode=require&channel_binding=require` |
| Add `FINANCIAL_SYSTEM_DATABASE_URL` to Vercel env vars (Production + Preview) | ✅ | Set 2026-02-17 |
| Add `FINANCIAL_SYSTEM_DATABASE_URL` to local `.env` | ✅ | Set 2026-02-17 |
| Verify: what is General Fund's `id` in financial-system? | ✅ | **id = 1** |

---

## 14. Open Questions

| # | Question | Answer |
|---|----------|--------|
| Q1 | Does `expense_reports_role` exist on financial-system Neon yet? | ✅ Yes — confirmed working on production branch (`ep-misty-cake`) |
| Q2 | What is the General Fund's `id` in financial-system? | ✅ **id = 1** (`General Fund`, `UNRESTRICTED`) |
| Q3 | Should email-receipt pipeline auto-assign default fund + GL account? | ✅ Yes — default fund = General Fund (id 1), GL account = blank (user must select before submit) |
| Q4 | Keep `projectId`/`projectName` columns for historical data or migrate? | ✅ Keep nullable, stop writing to them, drop in future migration |
| Q5 | How to identify "lodging" expenses for receipt rule? | ✅ GL account **id = 74, code 5710 "Lodging"**. Match by `gl_account_id` in compliance validation |

---

## 15. Session Progress

### Session 1: 2026-02-17 (Plan Creation)

**Completed:**
- [x] Read financial-system integration spec (`integrations/expense-reports-homegrown.md`)
- [x] Read staging integration guide (`docs/staging-integration-guide.md`)
- [x] Read expense discovery sessions (`3-expense-discovery.md`)
- [x] Explored expense-reports-homegrown full architecture (schema, services, routes, UI, QBO, auth)
- [x] Explored renewal-timesheets integration plan (reference pattern)
- [x] Explored financial-system staging_records schema
- [x] Created this plan document

**Next Steps:**
- [x] Jeff: Create `expense_reports_role` on financial-system Neon DB — already existed
- [x] Jeff: Add `FINANCIAL_SYSTEM_DATABASE_URL` to Vercel + local .env — set in local, production, preview
- [x] Answer open questions (Q1-Q5) — all resolved
- [ ] Begin Phase 1: QBO Deprecation

### Session 2: 2026-02-17 (Pre-Build Setup)

**Completed:**
- [x] Verified `expense_reports_role` exists and works on production Neon branch
- [x] Set `FINANCIAL_SYSTEM_DATABASE_URL` in local `.env`, Vercel production, Vercel preview
- [x] Confirmed connection: 6 funds, 72 expense accounts visible via role
- [x] Added 3 new GL accounts to financial-system (production + dev branches):
  - `5700 Travel` (id 73)
  - `5710 Lodging` (id 74)
  - `5720 Meals` (id 75)
- [x] Note: preview branch has no `accounts` table (uninitialized Neon branch)
- [x] Answered all open questions (Q1-Q5)
- [x] Discovered financial-system has 3 Neon branches: production (`ep-misty-cake`), dev (`ep-winter-bar`), preview (`ep-muddy-shape`)

**Next Steps:**
- [ ] Begin Phase 1: QBO Deprecation
