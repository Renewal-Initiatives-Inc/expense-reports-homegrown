# Design: Expense Reports Homegrown

> **System design for a production-quality expense management application**

## 1. Overview

### 1.1 Problem Statement

Employees at Renewal Initiatives need to submit expense reports (out-of-pocket purchases and mileage) for reimbursement through QuickBooks Online. While Ramp provides this capability, this project builds a custom solution to learn QBO API integration, AI-powered receipt scanning, and production software development practices.

### 1.2 Solution Approach

A Next.js web application that:

1. Authenticates users via existing Zitadel infrastructure (SSO with App Portal)
2. Captures expenses through camera-based receipt scanning and mileage entry
3. Uses Claude Vision to extract receipt data and suggest categories
4. Routes reports through a simple approval workflow
5. Syncs approved reports to QuickBooks Online as bills

### 1.3 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         expense-reports-homegrown                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐   │
│  │   Next.js    │────▶│   Drizzle    │────▶│   Vercel Postgres    │   │
│  │   App Router │     │     ORM      │     │       (Neon)         │   │
│  └──────┬───────┘     └──────────────┘     └──────────────────────┘   │
│         │                                                               │
│         │  ┌──────────────────────────────────────────────────────┐    │
│         │  │                    External APIs                      │    │
│         │  ├──────────────┬───────────────┬───────────────────────┤    │
│         └─▶│   Zitadel    │  Claude       │  QuickBooks  │ Google │    │
│            │   (Auth)     │  Vision       │  Online      │ Maps   │    │
│            └──────────────┴───────────────┴──────────────┴────────┘    │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │ Vercel Blob  │◀── Receipt images                                    │
│  └──────────────┘                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Design Principles

### P1: QBO as Source of Truth for Reference Data

Categories and projects live in QuickBooks Online. The app fetches and caches them but never maintains its own list. This ensures accounting consistency and reduces data synchronization complexity.

### P2: AI-Assisted, Human-Confirmed

Claude Vision extracts receipt data and suggests categories, but humans always confirm. Confidence indicators help users calibrate trust. The AI accelerates data entry; it doesn't replace human judgment.

### P3: Simple State Machine

Reports follow a linear progression: Open → Submitted → Approved/Rejected. Rejected reports return to Open. No complex branching, no parallel states, no conditional transitions.

### P4: Fail Gracefully, Retry Explicitly

External API failures (QBO, Google Maps, Claude) show user-friendly messages and offer retry options. Partial failures don't corrupt data. Users always know what happened and what to do next.

### P5: Consistent with Platform

Use the same patterns, components, and conventions as the App Portal. A developer (or AI) familiar with one codebase should feel at home in the other.

---

## 3. Technology Approach

> **Note**: Detailed technology decisions will be made during `/tech-stack`. This section documents the baseline from App Portal consistency requirements.

### 3.1 Confirmed Stack (Platform Consistency)

| Layer        | Technology                    | Rationale                      |
| ------------ | ----------------------------- | ------------------------------ |
| Framework    | Next.js 16+ (App Router)      | Platform standard              |
| Language     | TypeScript 5                  | Type safety, platform standard |
| Styling      | Tailwind CSS v4 + shadcn/ui   | Platform design system         |
| Database     | Vercel Postgres + Drizzle ORM | Platform standard              |
| Auth         | NextAuth.js v5 + Zitadel      | Platform SSO                   |
| File Storage | Vercel Blob                   | Platform standard              |
| Testing      | Vitest + Playwright           | Platform standard              |
| Deployment   | Vercel                        | Platform standard              |

### 3.2 New Integrations (To Configure)

| Integration                 | Purpose                     | Setup Required                            |
| --------------------------- | --------------------------- | ----------------------------------------- |
| QuickBooks Online API       | Bills, categories, projects | OAuth app registration, developer account |
| Claude Vision API           | Receipt OCR                 | API key (existing Anthropic account)      |
| Google Maps Distance Matrix | Mileage calculation         | API key, billing enabled                  |

---

## 4. Correctness Properties

These invariants must hold across all valid states of the system.

### CP1: Report Status Integrity

**Property**: For any expense report R, R.status is exactly one of {Open, Submitted, Approved, Rejected}.

**Validates**: R2 (Report Management), R8 (Approval Workflow)

### CP2: Status Transition Validity

**Property**: For any expense report R, valid status transitions are:

- Open → Submitted (user submits)
- Submitted → Approved (admin approves)
- Submitted → Rejected (admin rejects)
- Rejected → Open (automatic on rejection)
- Rejected → Submitted (user resubmits, via Open)

No other transitions are valid.

**Validates**: R2, R7, R8, R9

### CP3: Non-Empty Submission

**Property**: For any expense report R where R.status = Submitted, R must contain at least one expense.

**Validates**: R7 (Report Submission)

### CP4: Required Fields Present

**Property**: For any expense E:

- If E.type = "out-of-pocket": E.amount, E.date, E.category must be non-null
- If E.type = "mileage": E.origin, E.destination, E.date, E.miles must be non-null

**Validates**: R3, R4

### CP5: Billable Requires Project

**Property**: For any expense E where E.billable = true, E.project must be non-null.

**Validates**: R3, R6

### CP6: QBO Sync Idempotency

**Property**: For any expense report R where R.qbo_bill_id is non-null, no subsequent QBO sync operation will create a new bill for R.

**Validates**: R10 (QBO Integration)

### CP7: Rejection Requires Comment

**Property**: For any expense report R where R.status = Rejected, R.reviewer_comment must be non-null and non-empty.

**Validates**: R8 (Approval Workflow)

### CP8: Approved Reports Immutable

**Property**: For any expense report R where R.status = Approved, no modification to R or its expenses is permitted.

**Validates**: R2, R8

### CP9: Category Source Consistency

**Property**: For any expense E, E.category must reference a valid account ID from the QBO chart of accounts.

**Validates**: R5 (Categories from QBO)

### CP10: Mileage Calculation Consistency

**Property**: For any mileage expense E, E.amount = E.miles × current_irs_rate (at time of creation).

**Validates**: R4, R12

---

## 5. Business Logic Flows

### 5.1 Expense Report Lifecycle

```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌─────────┐    User adds expenses,     ┌─────────┐
│  Open   │◀──────edits, saves─────────│ Rejected│
└────┬────┘                            └────▲────┘
     │                                      │
     │ User clicks "Submit"                 │ Admin rejects
     │ (validates ≥1 expense)               │ (requires comment)
     ▼                                      │
┌─────────┐                                 │
│Submitted│─────────────────────────────────┘
└────┬────┘
     │
     │ Admin approves
     │ (triggers QBO sync)
     ▼
┌─────────┐
│Approved │───▶ QBO Bill Created
└─────────┘
```

### 5.2 Receipt Capture Flow

```
User clicks "Add Receipt"
     │
     ▼
┌─────────────────────┐
│ Camera preview shown │
│ (or file upload)     │
└──────────┬──────────┘
           │
           │ Image captured/selected
           ▼
┌─────────────────────┐
│ Send to Claude      │
│ Vision API          │
│ - Extract fields    │
│ - Suggest category  │
└──────────┬──────────┘
           │
           │ Results returned
           ▼
┌─────────────────────┐
│ Display extracted   │
│ data with confidence│
│ indicators          │
└──────────┬──────────┘
           │
           │ User confirms/edits
           ▼
┌─────────────────────┐
│ Save expense        │
│ Upload image to Blob│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ "Add another?" or   │
│ "Done"              │
└─────────────────────┘
```

### 5.3 Mileage Entry Flow

```
User clicks "Add Mileage"
     │
     ▼
┌─────────────────────┐
│ Enter origin address│
│ Enter destination   │
│ (optional: add stops)│
└──────────┬──────────┘
           │
           │ Addresses entered
           ▼
┌─────────────────────┐
│ Call Google Maps    │
│ Distance Matrix API │
└──────────┬──────────┘
           │
           │ Distance returned
           ▼
┌─────────────────────┐
│ Display:            │
│ - Calculated miles  │
│ - IRS rate          │
│ - Total amount      │
└──────────┬──────────┘
           │
           │ User confirms (or overrides miles)
           ▼
┌─────────────────────┐
│ Save mileage expense│
└─────────────────────┘
```

### 5.4 QBO Sync Flow

```
Report status changes to Approved
     │
     ▼
┌─────────────────────┐
│ Check: qbo_bill_id  │
│ already exists?     │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
   Yes          No
     │           │
     ▼           ▼
  [Skip]   ┌─────────────────────┐
           │ Construct Bill:     │
           │ - Vendor = employee │
           │ - Line items        │
           │ - Attachments       │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ POST to QBO API     │
           └──────────┬──────────┘
                      │
              ┌───────┴───────┐
              │               │
           Success          Failure
              │               │
              ▼               ▼
     ┌────────────────┐  ┌────────────────┐
     │ Store bill_id  │  │ Log error      │
     │ on report      │  │ Mark for retry │
     └────────────────┘  └────────────────┘
```

### 5.5 QBO Data Refresh Flow

```
┌─────────────────────┐
│ App startup / user  │
│ opens category      │
│ dropdown            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Check cache age     │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
  Fresh        Stale (>1hr)
     │           │
     ▼           ▼
  [Use cache]  ┌─────────────────────┐
               │ Fetch from QBO API  │
               └──────────┬──────────┘
                          │
                  ┌───────┴───────┐
                  │               │
               Success          Failure
                  │               │
                  ▼               ▼
         ┌────────────────┐  ┌────────────────┐
         │ Update cache   │  │ Use stale cache│
         │ Return fresh   │  │ Log warning    │
         └────────────────┘  └────────────────┘
```

---

## 6. Error Handling Strategy

### 6.1 Error Categories

| Category                     | Example                   | User Message                                       | Technical Action     |
| ---------------------------- | ------------------------- | -------------------------------------------------- | -------------------- |
| **Validation**               | Missing required field    | Inline field error                                 | Prevent submission   |
| **Auth**                     | Session expired           | "Please sign in again"                             | Redirect to login    |
| **External API (transient)** | QBO rate limited          | "Couldn't reach QuickBooks. Try again?"            | Log, offer retry     |
| **External API (permanent)** | Invalid QBO credentials   | "QuickBooks connection needs to be renewed"        | Admin notification   |
| **AI Processing**            | Claude can't read receipt | "Couldn't extract details. Please enter manually." | Log, show empty form |
| **System**                   | Database unavailable      | "Something went wrong. Please try again."          | Log, alert           |

### 6.2 Retry Strategy

- **Automatic retry**: None (user-initiated only to maintain control)
- **Retry UI**: Toast with "Try Again" button for transient failures
- **Retry limits**: 3 attempts before suggesting user contact admin
- **Backoff**: Not applicable (manual retry)

### 6.3 Partial Failure Handling

**Scenario**: QBO sync fails after report marked Approved

**Handling**:

1. Report remains Approved (status change committed)
2. `qbo_bill_id` remains null (sync not committed)
3. Error logged with report ID
4. Admin dashboard shows "Pending QBO Sync" indicator
5. Manual retry available in admin UI

### 6.4 Data Integrity

- All multi-step operations use database transactions
- External API calls are NOT in transactions (can't roll back external state)
- Idempotency keys prevent duplicate QBO bills
- Receipt images uploaded before expense record created (orphan cleanup via cron)

---

## 7. Testing Strategy

### 7.1 Testing Pyramid

```
        ┌─────────┐
        │   E2E   │  Playwright: Critical user journeys
        │  (10%)  │
        ├─────────┤
        │ Integr. │  Vitest: API routes, DB operations
        │  (30%)  │
        ├─────────┤
        │  Unit   │  Vitest: Components, utilities, validation
        │  (60%)  │
        └─────────┘
```

### 7.2 Unit Tests (Vitest)

**Target**: Pure functions, React components, validation logic

**Examples**:

- `calculateMileageAmount(miles, rate)` returns correct value
- `validateExpense(expense)` catches missing fields
- `<ExpenseCard />` renders all fields correctly
- `formatCurrency(amount)` handles edge cases

**Coverage target**: 80% of non-generated code

### 7.3 Integration Tests (Vitest + MSW)

**Target**: API routes, database operations, external API mocking

**Examples**:

- POST `/api/reports` creates report in database
- GET `/api/qbo/categories` returns cached or fresh data
- Receipt processing pipeline extracts data correctly (mocked Claude)
- Approval flow updates status and creates notification

**Approach**:

- Mock external APIs (QBO, Claude, Google Maps) with MSW
- Use test database (or in-memory)
- Test happy paths and error conditions

### 7.4 E2E Tests (Playwright)

**Target**: Critical user journeys, cross-browser verification

**Test Cases**:

1. **Submit expense report**: Login → Create report → Add receipt expense → Add mileage → Submit → Verify status
2. **Approve report**: Login as admin → View pending → Approve → Verify QBO sync attempted
3. **Reject and resubmit**: Login as admin → Reject with comment → Login as submitter → Edit → Resubmit
4. **Camera capture**: Test receipt capture flow (may need to mock camera)

**Approach**:

- Use test mode (similar to App Portal's E2E test mode)
- Seed test data before runs
- Clean up after tests

### 7.5 Property-Based Tests

**Target**: Correctness properties from Section 4

**Examples**:

- Generate random status transitions, verify only valid ones succeed
- Generate expenses with random field combinations, verify validation catches invalid states
- Generate mileage inputs, verify calculation consistency

### 7.6 Manual Testing Checklist

Before release:

- [ ] Receipt capture on multiple browsers (Chrome, Firefox, Safari)
- [ ] QBO sync with real production data
- [ ] Error messages display correctly
- [ ] Loading states appear appropriately
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces important changes

---

## 8. Data Model (Preliminary)

> **Note**: Final schema will be defined during implementation. This is directional.

### 8.1 Core Tables

```
expense_reports
├── id (uuid, PK)
├── user_id (string, from Zitadel)
├── name (string, nullable)
├── status (enum: open, submitted, approved, rejected)
├── submitted_at (timestamp, nullable)
├── reviewed_at (timestamp, nullable)
├── reviewer_id (string, nullable)
├── reviewer_comment (text, nullable)
├── qbo_bill_id (string, nullable)
├── created_at (timestamp)
└── updated_at (timestamp)

expenses
├── id (uuid, PK)
├── report_id (uuid, FK → expense_reports)
├── type (enum: out_of_pocket, mileage)
├── amount (decimal)
├── date (date)
├── merchant (string, nullable)
├── memo (text, nullable)
├── category_id (string, QBO account ID)
├── category_name (string, denormalized for display)
├── project_id (string, nullable, QBO project ID)
├── project_name (string, nullable, denormalized)
├── billable (boolean, default false)
├── receipt_url (string, nullable, Vercel Blob URL)
├── receipt_thumbnail_url (string, nullable)
├── origin_address (string, nullable, mileage only)
├── destination_address (string, nullable, mileage only)
├── miles (decimal, nullable, mileage only)
├── ai_confidence (jsonb, nullable, extraction confidence scores)
├── created_at (timestamp)
└── updated_at (timestamp)

notifications
├── id (uuid, PK)
├── user_id (string)
├── type (enum: report_submitted, report_approved, report_rejected)
├── report_id (uuid, FK → expense_reports)
├── message (string)
├── read (boolean, default false)
├── created_at (timestamp)
└── updated_at (timestamp)

settings
├── key (string, PK)
├── value (jsonb)
├── updated_at (timestamp)
└── updated_by (string)
```

### 8.2 Cached QBO Data

```
qbo_cache
├── key (string, PK) -- e.g., "categories", "projects"
├── data (jsonb)
├── fetched_at (timestamp)
└── expires_at (timestamp)
```

### 8.3 QBO OAuth Tokens

```
qbo_tokens
├── id (int, PK, always 1 -- single tenant)
├── access_token (text, encrypted)
├── refresh_token (text, encrypted)
├── realm_id (string, QBO company ID)
├── expires_at (timestamp)
├── updated_at (timestamp)
└── updated_by (string)
```

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

- All routes protected by NextAuth middleware (except `/login`, `/api/auth/*`)
- Role checks in server components and API routes
- Admin-only routes verify `admin` role from session

### 9.2 Data Protection

- QBO tokens encrypted at rest (use `AUTH_SECRET` for encryption key)
- Receipt images stored in Vercel Blob with signed URLs (time-limited access)
- No PII logged (user IDs only, not names/emails in logs)

### 9.3 API Security

- QBO API: OAuth 2.0, tokens refreshed before expiry
- Claude API: API key in environment variable, server-side only
- Google Maps API: API key restricted to Distance Matrix API, server-side only

### 9.4 Input Validation

- All user input validated with Zod schemas
- File uploads validated for type (images only) and size (max 10MB)
- SQL injection prevented by Drizzle ORM parameterized queries

---

## 10. Open Design Questions

To be resolved during implementation:

1. **QBO OAuth flow**: Where does the admin complete OAuth? Dedicated settings page or first-run wizard?
2. **Receipt thumbnail generation**: Generate on upload (slower) or lazy-generate on first view?
3. **Offline support**: Any need for PWA/offline capability, or always-online acceptable?
4. **Audit log**: Should we log all state changes for compliance, or is QBO the audit trail?
5. **Rate limiting**: Do we need rate limiting for API routes given ~2 users?

---

## 11. Next Steps

1. Run `/tech-stack` to confirm technology choices and identify any gaps
2. Set up QBO developer account and OAuth application
3. Set up Google Maps API key with Distance Matrix enabled
4. Create Zitadel application and role for `app:expense-reports-homegrown`
5. Initialize Next.js project with App Portal patterns
6. Begin Phase 1 implementation (auth + basic CRUD)
