# Phase 2: Database & Basic Report CRUD - Execution Plan

> **Goal**: Establish database schema and basic expense report management.
> **Deliverable**: User can create, view, edit, and delete expense reports (without expenses yet).

---

## Prerequisites Verification

Before starting Phase 2, verify Phase 1 is complete:

- [x] Next.js 16+ project with App Router initialized
- [x] NextAuth.js v5 configured with Zitadel OIDC (PKCE flow)
- [x] Protected routes middleware working
- [x] Basic layout with header, navigation, user menu
- [x] Role-based access (user/admin) available in session
- [x] shadcn/ui components installed
- [x] Vitest testing infrastructure ready

**External Setup Required for Phase 2**:
- [ ] Vercel Postgres database provisioned (or Neon direct)
- [ ] Database connection string available

---

## Task Breakdown

### Task 2.1: Set Up Vercel Postgres Connection

**Files to create/modify**:
- `.env.local` - Add database connection strings
- `.env.example` - Document required variables
- `src/lib/db/index.ts` - Database connection singleton

**Environment variables needed**:
```
POSTGRES_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...  # For migrations
```

**Acceptance Criteria**:
- Database connection established without error
- Connection pooling configured for serverless
- Connection tested via simple query

---

### Task 2.2: Configure Drizzle ORM

**Files to create**:
- `drizzle.config.ts` - Drizzle configuration
- `src/lib/db/index.ts` - Drizzle client export
- `src/lib/db/schema/index.ts` - Schema barrel export

**Dependencies to install**:
```bash
npm install drizzle-orm @vercel/postgres
npm install -D drizzle-kit
```

**Package.json scripts to add**:
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

**Acceptance Criteria**:
- Drizzle configured with Vercel Postgres adapter
- Schema can be generated into SQL migrations
- `drizzle-kit studio` launches successfully

---

### Task 2.3: Create Database Schema - expense_reports Table

**File to create**: `src/lib/db/schema/expense-reports.ts`

**Schema based on design.md Section 8.1**:
```typescript
export const expenseReports = pgTable('expense_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),           // From Zitadel session
  name: text('name'),                          // Optional, defaults to "Report YYYY-MM-DD"
  status: text('status', { enum: ['open', 'submitted', 'approved', 'rejected'] })
    .notNull()
    .default('open'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  reviewerId: text('reviewer_id'),
  reviewerComment: text('reviewer_comment'),
  qboBillId: text('qbo_bill_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Correctness Properties Enforced**:
- CP1: Status is exactly one of {open, submitted, approved, rejected}
- CP7: Rejection requires comment (enforced in business logic)

**Acceptance Criteria**:
- Table schema matches design.md specification
- Indexes on userId and status for query performance
- TypeScript types exported for use in application

---

### Task 2.4: Create Database Schema - expenses Table

**File to create**: `src/lib/db/schema/expenses.ts`

**Schema based on design.md Section 8.1**:
```typescript
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => expenseReports.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['out_of_pocket', 'mileage'] }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  date: date('date').notNull(),
  merchant: text('merchant'),
  memo: text('memo'),
  categoryId: text('category_id'),             // QBO account ID
  categoryName: text('category_name'),         // Denormalized for display
  projectId: text('project_id'),               // QBO project ID
  projectName: text('project_name'),           // Denormalized
  billable: boolean('billable').default(false),
  receiptUrl: text('receipt_url'),             // Vercel Blob URL
  receiptThumbnailUrl: text('receipt_thumbnail_url'),
  originAddress: text('origin_address'),       // Mileage only
  destinationAddress: text('destination_address'),
  miles: numeric('miles', { precision: 6, scale: 2 }),
  aiConfidence: jsonb('ai_confidence'),        // Extraction confidence scores
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Note**: This table is created now but not used until Phase 3. Creating it early ensures schema is complete.

**Acceptance Criteria**:
- Foreign key to expense_reports with cascade delete
- Index on reportId for efficient joins
- Supports both expense types with nullable type-specific fields

---

### Task 2.5: Create Database Schema - notifications Table

**File to create**: `src/lib/db/schema/notifications.ts`

**Schema**:
```typescript
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: text('type', { enum: ['report_submitted', 'report_approved', 'report_rejected'] }).notNull(),
  reportId: uuid('report_id').references(() => expenseReports.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Note**: Used in Phase 9 but schema defined now for completeness.

---

### Task 2.6: Create Database Schema - settings Table

**File to create**: `src/lib/db/schema/settings.ts`

**Schema**:
```typescript
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})
```

**Initial seed data**:
```typescript
// IRS mileage rate for 2025
{ key: 'irs_mileage_rate', value: { rate: 0.70, effectiveDate: '2025-01-01' } }
```

---

### Task 2.7: Create Database Schema - QBO Tables

**File to create**: `src/lib/db/schema/qbo.ts`

**qbo_cache schema**:
```typescript
export const qboCache = pgTable('qbo_cache', {
  key: text('key').primaryKey(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
})
```

**qbo_tokens schema**:
```typescript
export const qboTokens = pgTable('qbo_tokens', {
  id: integer('id').primaryKey().default(1),  // Single tenant, always 1
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  realmId: text('realm_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})
```

**Security Note**: Tokens should be encrypted at rest. Add encryption utility in Phase 7.

---

### Task 2.8: Set Up Drizzle Migrations

**Commands to run**:
```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations to database
```

**Files created automatically**:
- `drizzle/` directory with SQL migration files
- Migration metadata files

**Acceptance Criteria**:
- All tables created in database
- Migrations versioned and tracked
- Can reset and replay migrations cleanly

---

### Task 2.9: Create Report Types and Validation

**Files to create**:
- `src/types/reports.ts` - TypeScript types for reports
- `src/lib/validations/reports.ts` - Zod schemas for validation

**Types**:
```typescript
export type ReportStatus = 'open' | 'submitted' | 'approved' | 'rejected'

export interface ExpenseReport {
  id: string
  userId: string
  name: string | null
  status: ReportStatus
  submittedAt: Date | null
  reviewedAt: Date | null
  reviewerId: string | null
  reviewerComment: string | null
  qboBillId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateReportInput {
  name?: string
}

export interface UpdateReportInput {
  name?: string
}
```

**Zod Schemas**:
```typescript
export const createReportSchema = z.object({
  name: z.string().max(100).optional(),
})

export const updateReportSchema = z.object({
  name: z.string().max(100).optional(),
})
```

---

### Task 2.10: Build API Routes for Report CRUD

**Files to create**:
- `src/app/api/reports/route.ts` - GET (list), POST (create)
- `src/app/api/reports/[id]/route.ts` - GET (single), PUT (update), DELETE

**GET /api/reports**:
- Returns all reports for current user
- Ordered by createdAt descending
- Includes expense count (for future phases)

**POST /api/reports**:
- Creates new report with status 'open'
- Defaults name to "Report YYYY-MM-DD" if not provided
- Returns created report

**GET /api/reports/[id]**:
- Returns single report with expenses (empty for now)
- Verifies ownership (user can only see own reports)

**PUT /api/reports/[id]**:
- Updates report name
- Only allowed for 'open' status reports
- Verifies ownership

**DELETE /api/reports/[id]**:
- Deletes report and associated expenses (cascade)
- Only allowed for 'open' status reports
- Verifies ownership

**Error Responses**:
- 401: Unauthorized (not logged in)
- 403: Forbidden (not owner / wrong status)
- 404: Report not found
- 422: Validation error

**Correctness Properties Enforced**:
- CP2: Only open reports can be edited/deleted
- CP8: Approved reports are immutable

---

### Task 2.11: Create Data Access Layer

**File to create**: `src/lib/db/queries/reports.ts`

**Functions**:
```typescript
// List reports for a user
export async function getReportsByUserId(userId: string): Promise<ExpenseReport[]>

// Get single report (with ownership check)
export async function getReportById(id: string, userId: string): Promise<ExpenseReport | null>

// Create new report
export async function createReport(userId: string, input: CreateReportInput): Promise<ExpenseReport>

// Update report (validates status = open)
export async function updateReport(id: string, userId: string, input: UpdateReportInput): Promise<ExpenseReport>

// Delete report (validates status = open)
export async function deleteReport(id: string, userId: string): Promise<void>

// Get report count by status for dashboard
export async function getReportCountsByStatus(userId: string): Promise<Record<ReportStatus, number>>
```

---

### Task 2.12: Create "My Reports" Page

**File to create**: `src/app/(protected)/reports/page.tsx`

**UI Requirements**:
- Page title: "My Reports"
- "New Report" button (primary action)
- Table/list of reports with columns:
  - Name (with link to detail)
  - Status (badge with color coding)
  - Created date
  - Actions (Edit, Delete - only for Open reports)
- Empty state: "No reports yet. Create your first expense report."
- Loading state while fetching

**Status Badge Colors** (from shadcn Badge variants):
- Open: default (gray)
- Submitted: secondary (blue)
- Approved: success (green)
- Rejected: destructive (red)

---

### Task 2.13: Create Status Badge Component

**File to create**: `src/components/ui/status-badge.tsx`

**Component**:
```typescript
interface StatusBadgeProps {
  status: ReportStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // Map status to badge variant and label
}
```

**Visual Design**:
- Open: Gray background, "Open" text
- Submitted: Blue background, "Submitted" text
- Approved: Green background, "Approved" text
- Rejected: Red background, "Rejected" text

---

### Task 2.14: Create Report Detail Page

**File to create**: `src/app/(protected)/reports/[id]/page.tsx`

**UI Requirements**:
- Report name as page title (or "Report YYYY-MM-DD" default)
- Status badge
- Edit button (only if Open)
- Delete button (only if Open) with confirmation dialog
- Metadata: Created date, Submitted date (if applicable)
- Reviewer comment (if rejected, read-only)
- Empty expenses state: "No expenses yet. Add your first expense."
- Back to reports link

**Note**: Expense list UI will be added in Phase 3.

---

### Task 2.15: Create New Report Form

**Files to create**:
- `src/app/(protected)/reports/new/page.tsx` - New report page
- `src/components/reports/report-form.tsx` - Reusable form component

**Form Fields**:
- Name (optional text input, max 100 chars)
  - Placeholder: "e.g., Cincinnati Trip"
  - Helper text: "Leave blank for default name"

**Form Actions**:
- Save: Creates report and redirects to report detail
- Cancel: Returns to reports list

---

### Task 2.16: Create Edit Report Page

**File to create**: `src/app/(protected)/reports/[id]/edit/page.tsx`

**UI Requirements**:
- Same form as new report, pre-populated
- Only accessible if status is 'open'
- Redirect to detail page with error toast if not open

---

### Task 2.17: Add Confirmation Dialog Component

**File to create**: `src/components/ui/alert-dialog.tsx`

Install shadcn component:
```bash
npx shadcn@latest add alert-dialog
```

**Usage**: Confirm before deleting a report

---

### Task 2.18: Add Toast Notifications

**File to create**: `src/components/ui/toast.tsx` and related files

Install shadcn components:
```bash
npx shadcn@latest add toast sonner
```

**Usage**:
- Success: "Report created successfully"
- Success: "Report updated successfully"
- Success: "Report deleted successfully"
- Error: "Failed to delete report"
- Error: "You can only edit open reports"

---

### Task 2.19: Update Navigation

**File to modify**: `src/components/layout/nav.tsx`

**Add navigation items**:
- Dashboard (existing)
- My Reports (new, links to /reports)

---

### Task 2.20: Update Dashboard

**File to modify**: `src/app/(protected)/page.tsx`

**Changes**:
- Show report counts by status (Open, Submitted, Approved, Rejected)
- Add quick action card to create new report
- Show recent reports (last 5) with status
- Admin view: Show count of reports pending approval (Submitted status)

---

## Tests to Write

### Unit Tests

**File**: `src/lib/db/queries/__tests__/reports.test.ts`
- Test CRUD operations with mocked database
- Test status validation (can't edit non-open reports)
- Test ownership validation

**File**: `src/lib/validations/__tests__/reports.test.ts`
- Test Zod schema validation
- Test max length constraints
- Test optional vs required fields

**File**: `src/components/reports/__tests__/report-form.test.tsx`
- Test form rendering
- Test validation errors
- Test form submission

**File**: `src/components/ui/__tests__/status-badge.test.tsx`
- Test correct variant for each status
- Test accessibility (role="status")

### Integration Tests

**File**: `src/app/api/reports/__tests__/route.test.ts`
- Test GET returns user's reports only
- Test POST creates report with default name
- Test POST creates report with custom name
- Test authentication required

**File**: `src/app/api/reports/[id]/__tests__/route.test.ts`
- Test GET returns report for owner
- Test GET returns 404 for non-owner
- Test PUT updates open report
- Test PUT returns 403 for non-open report
- Test DELETE removes open report
- Test DELETE returns 403 for non-open report

---

## Requirements Satisfied

This phase satisfies the following acceptance criteria from requirements.md:

### R2: Expense Report Management

| Criteria | Status |
|----------|--------|
| R2.1: Allow users to create new expense reports | ✓ Implemented |
| R2.2: Assign default name "Report YYYY-MM-DD" | ✓ Implemented |
| R2.3: Allow optional custom name | ✓ Implemented |
| R2.4: Display all reports for current user | ✓ Implemented |
| R2.5: Show status (Open, Submitted, Approved, Rejected) | ✓ Implemented |
| R2.6: Allow edit for Open status only | ✓ Implemented |
| R2.7: Allow delete for Open status only | ✓ Implemented |
| R2.8: Prevent modification of non-Open reports | ✓ Implemented |

### R14: Dashboard and Reporting (Partial)

| Criteria | Status |
|----------|--------|
| R14.1: Display dashboard as landing page | ✓ Updated |
| R14.2: Show summary counts by status | ✓ Implemented |
| R14.3: Show recent expense reports | ✓ Implemented |
| R14.4: Quick action to create new report | ✓ Implemented |

---

## Correctness Properties Verified

| Property | Verification |
|----------|-------------|
| CP1: Report Status Integrity | Enum constraint in database schema |
| CP2: Status Transition Validity | Business logic in API routes (edit/delete only open) |
| CP8: Approved Reports Immutable | API route guards prevent modification |

---

## Dependencies on Phase 1

| Dependency | Verified |
|------------|----------|
| Authentication working | ✓ Session available in server components |
| Protected routes | ✓ Middleware redirects unauthenticated |
| User ID available | ✓ Via `session.user.id` |
| Role available | ✓ Via `session.user.role` |
| shadcn/ui components | ✓ Button, Card, Badge installed |
| Layout structure | ✓ Header, navigation in place |

---

## File Summary

### New Files to Create

```
src/
├── lib/
│   ├── db/
│   │   ├── index.ts                    # Database connection
│   │   ├── schema/
│   │   │   ├── index.ts               # Barrel export
│   │   │   ├── expense-reports.ts     # Reports table
│   │   │   ├── expenses.ts            # Expenses table
│   │   │   ├── notifications.ts       # Notifications table
│   │   │   ├── settings.ts            # Settings table
│   │   │   └── qbo.ts                 # QBO cache and tokens
│   │   └── queries/
│   │       ├── reports.ts             # Report CRUD functions
│   │       └── __tests__/
│   │           └── reports.test.ts
│   └── validations/
│       ├── reports.ts                 # Zod schemas
│       └── __tests__/
│           └── reports.test.ts
├── types/
│   └── reports.ts                     # Report TypeScript types
├── components/
│   ├── ui/
│   │   ├── status-badge.tsx          # Status display component
│   │   ├── alert-dialog.tsx          # Confirmation dialogs
│   │   ├── toast.tsx                 # Toast notifications
│   │   └── __tests__/
│   │       └── status-badge.test.tsx
│   └── reports/
│       ├── report-form.tsx           # Create/edit form
│       └── __tests__/
│           └── report-form.test.tsx
├── app/
│   ├── api/
│   │   └── reports/
│   │       ├── route.ts              # GET, POST
│   │       ├── [id]/
│   │       │   └── route.ts          # GET, PUT, DELETE
│   │       └── __tests__/
│   │           └── route.test.ts
│   └── (protected)/
│       └── reports/
│           ├── page.tsx              # My Reports list
│           ├── new/
│           │   └── page.tsx          # New report form
│           └── [id]/
│               ├── page.tsx          # Report detail
│               └── edit/
│                   └── page.tsx      # Edit report form
drizzle.config.ts                     # Drizzle configuration
```

### Files to Modify

```
.env.local                            # Add database URLs
.env.example                          # Document database vars
package.json                          # Add db scripts
src/components/layout/nav.tsx         # Add Reports link
src/app/(protected)/page.tsx          # Update dashboard
```

---

## Execution Order

1. **Database Setup** (Tasks 2.1-2.2)
   - Install dependencies
   - Configure Drizzle
   - Set up connection

2. **Schema Creation** (Tasks 2.3-2.8)
   - Create all table schemas
   - Generate and run migrations

3. **Types & Validation** (Task 2.9)
   - Define TypeScript types
   - Create Zod schemas

4. **Data Layer** (Tasks 2.10-2.11)
   - Create query functions
   - Create API routes
   - Write tests

5. **UI Components** (Tasks 2.13, 2.17-2.18)
   - Status badge
   - Alert dialog
   - Toast notifications

6. **Pages** (Tasks 2.12, 2.14-2.16)
   - My Reports list
   - Report detail
   - New/Edit forms

7. **Integration** (Tasks 2.19-2.20)
   - Update navigation
   - Update dashboard

8. **Testing & Polish**
   - Run all tests
   - Manual testing of flows
   - Fix any issues

---

## Estimated Complexity

| Area | Complexity | Notes |
|------|------------|-------|
| Database setup | Low | Standard Drizzle configuration |
| Schema creation | Low | Direct translation from design.md |
| API routes | Medium | Auth checks, validation, error handling |
| UI pages | Medium | Multiple pages, forms, state management |
| Testing | Medium | Mocking database for unit tests |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Vercel Postgres not provisioned | Can use local Postgres or Neon directly |
| Connection pooling issues | Use Neon serverless driver with pooling |
| Migration conflicts | Start fresh, no existing data |
| Form state complexity | Use react-hook-form with Zod resolver |
