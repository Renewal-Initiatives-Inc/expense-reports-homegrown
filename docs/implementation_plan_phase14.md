# Phase 14: Email Receipt Processing Pipeline — Implementation Plan

## Context

Phase 13 (AWS infrastructure scaffold) is complete and verified working end-to-end as of 2026-02-12:
- Emails to `receipts@inbound.renewalinitiatives.org` flow through SES → S3 → SNS → Vercel webhook
- MX record on Namecheap: `inbound` → `inbound-smtp.us-east-1.amazonaws.com`
- Domain identity verified: `renewalinitiatives.org` (parent domain, DKIM 1024-bit)
- SES receipt rule: `receipt-email-to-s3-and-sns` (single S3 action with SNS topic attached)
- Webhook logs: `[email/inbound] Email received: { messageId, s3Location, sizeBytes }`

Phase 14 extends the webhook to parse MIME, verify sender, extract receipt data, and create expenses.

## DNS/Infrastructure Notes (for reference)

- **Namecheap CNAME limit**: 50 characters in Host field. DKIM CNAMEs for parent domain fit (44 chars). Subdomain CNAMEs would be 51+ chars — if you ever need `inbound.renewalinitiatives.org` as a separate SES identity, switch DNS to Cloudflare.
- **Fastmail DNS caching**: Fastmail's resolvers cached the pre-MX "not found" result and bounced emails even after MX propagated. Gmail worked first. Fastmail should resolve on its own.
- **AWS credentials**: Vercel env vars had trailing whitespace causing `ERR_INVALID_CHAR` in authorization header. Fixed in code with `.trim()` in `src/lib/email/s3.ts:14-15`. Also clean up the Vercel env vars directly.
- **SES actions**: Must be a SINGLE S3 action with SNS topic configured on it (not two separate actions). When split, the SNS notification's `receipt.action` has type "SNS" instead of "S3", missing `bucketName`/`objectKey` fields that `parseSnsNotification()` expects.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/email/parse.ts` | MIME parsing with postal-mime |
| `src/lib/email/process.ts` | Pipeline orchestration |
| `src/lib/email/__tests__/parse.test.ts` | MIME parsing tests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/db/queries/users.ts` | Add `getUserByAnyEmail()` |
| `src/lib/db/queries/expenses.ts` | Add `createEmailExpense()`, `getExpenseByEmailMessageId()`, `checkDuplicateExpense()` |
| `src/lib/db/queries/reports.ts` | Add `findOrCreateEmailedReceiptsReport()` |
| `src/lib/blob.ts` | Add `uploadEmailAttachment()` supporting PDFs |
| `src/lib/email/index.ts` | Export new modules |
| `src/app/api/email/inbound/route.ts` | Wire up pipeline (replace scaffold log at lines 73-79) |
| `src/app/api/email/inbound/__tests__/route.test.ts` | Update tests for pipeline |

---

## Step-by-Step Implementation

### Step 1: MIME Parsing — `src/lib/email/parse.ts` (NEW)

**Dependencies**: `postal-mime` v2.7.3 (already installed)

```typescript
import PostalMime from 'postal-mime'

export interface ParsedEmail {
  messageId: string | null
  from: string | null          // email address
  fromName: string | null      // display name
  subject: string | null
  date: Date | null
  html: string | null
  text: string | null
  attachments: ParsedAttachment[]
}

export interface ParsedAttachment {
  filename: string | null
  mimeType: string
  content: ArrayBuffer
  disposition: string | null
  contentId: string | null
}

const RECEIPT_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'application/pdf',
]

export async function parseMimeEmail(rawEmail: string): Promise<ParsedEmail>
// postal-mime's `from` field is { address, name } object
// Extract address and name separately

export function getReceiptAttachments(attachments: ParsedAttachment[]): ParsedAttachment[]
// Filter to RECEIPT_MIME_TYPES only
```

### Step 2: User Lookup — `src/lib/db/queries/users.ts` (MODIFY)

```typescript
export async function getUserByAnyEmail(email: string): Promise<User | undefined>
```

- Normalize to lowercase
- Check `users.email` table first (primary email from Zitadel)
- Then check `userEmails.email` table (secondary emails, stored lowercase per ECP4)
- Return full `User` record or undefined
- Import `userEmails` from `../schema`

**Existing patterns to follow**: `getUserById()` at line 8 of same file. Uses Drizzle `eq()` for comparisons.

### Step 3: Blob Upload Extension — `src/lib/blob.ts` (MODIFY)

```typescript
export async function uploadEmailAttachment(
  content: ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<UploadResult>
```

- Accepts ArrayBuffer from postal-mime attachment
- Supports images + PDFs (expanded type list vs camera-only `ALLOWED_TYPES`)
- Uses `new Uint8Array(content)` for `put()` from `@vercel/blob`
- Stores under `receipts/email/{timestamp}-{uuid}.{ext}` prefix
- Reuses existing `MAX_FILE_SIZE` (10MB) and `UploadResult` type
- Reuses existing `BlobUploadError` class

### Step 4: Email Expense Functions — `src/lib/db/queries/expenses.ts` (MODIFY)

**4a. Idempotency check:**
```typescript
export async function getExpenseByEmailMessageId(emailMessageId: string): Promise<Expense | null>
// Simple query on expenses.emailMessageId field (already in schema)
```

**4b. Email expense creation:**
```typescript
export interface CreateEmailExpenseInput {
  type: ExpenseType           // always 'out_of_pocket' for email
  amount: string
  date: string
  merchant?: string | null
  memo?: string | null
  categoryId?: string | null
  categoryName?: string | null
  receiptUrl?: string | null
  receiptThumbnailUrl?: string | null
  aiConfidence?: Record<string, number> | null
  emailReceivedAt: Date
  emailMessageId: string
  duplicateFlag?: boolean
}

export async function createEmailExpense(
  reportId: string,
  userId: string,
  input: CreateEmailExpenseInput
): Promise<Expense>
// Inserts with source='email' + email-specific fields
// Does NOT check report status (Emailed Receipts report is always open)
// Updates report updatedAt timestamp
// Reuses existing mapExpenseRow() helper (line 215)
```

**4c. Duplicate detection:**
```typescript
export async function checkDuplicateExpense(
  userId: string, amount: string, merchant: string | null, date: string
): Promise<boolean>
// Joins expenses → expenseReports to check userId
// Case-insensitive merchant match via SQL LOWER()
// Returns false if amount is '0.00' or merchant is null (can't detect duplicates)
```

### Step 5: Report Singleton — `src/lib/db/queries/reports.ts` (MODIFY)

```typescript
export async function findOrCreateEmailedReceiptsReport(userId: string): Promise<ExpenseReport>
```

- Query for existing report where `name = 'Emailed Receipts'` AND `status = 'open'` AND `userId` matches
- If found, return it (reuse)
- If not found (or all are submitted/approved/rejected), create new via existing `createReport()`
- Order by `createdAt DESC` to get most recent if multiple exist

### Step 6: Pipeline Orchestration — `src/lib/email/process.ts` (NEW)

```typescript
export type ProcessResult =
  | { status: 'skipped_duplicate_message'; messageId: string }
  | { status: 'sender_unrecognized'; sender: string }
  | { status: 'expense_created'; expenseId: string; reportId: string }
  | { status: 'expense_created_no_extraction'; expenseId: string; reportId: string }

export async function processInboundEmail(
  rawEmail: string,
  sesMessageId: string
): Promise<ProcessResult>
```

**Pipeline steps (all wrapped in try/catch for EP2 "Always Create, Never Block"):**

1. **Parse MIME** via `parseMimeEmail(rawEmail)`
2. **Idempotency** — `getExpenseByEmailMessageId(sesMessageId)` → skip if exists, return 200 to stop SNS retries
3. **Sender verification** — `getUserByAnyEmail(parsed.from)` → if not found, return `sender_unrecognized` (Phase 15 adds auto-reply)
4. **Upload first receipt attachment** — `uploadEmailAttachment()` for first image/PDF. Catch errors, continue without receipt.
5. **Extract receipt data** — `processReceiptImage(receiptUrl, categories)` for images only. PDFs are uploaded but not extracted (Claude Vision image API doesn't accept PDFs). Catch errors, continue with partial data.
6. **Find/create report** — `findOrCreateEmailedReceiptsReport(userId)`
7. **Duplicate detection** — `checkDuplicateExpense()` → set flag (informational only, still creates expense)
8. **Create expense** — `createEmailExpense()` with extracted data or defaults (`amount: '0.00'`, memo from subject)
9. **Notification** — `createNotification({ type: 'email_receipt_processed', ... })`

**Categories for extraction**: Try `getCachedData<QboCategory[]>('categories')` from `src/lib/db/queries/qbo-cache.ts`, fall back to `EXPENSE_CATEGORIES` from `src/lib/categories.ts`. Map to `{ id, name }` format.

**Key imports from existing code:**
- `processReceiptImage` from `src/lib/receipt-extraction.ts` (line 187)
- `isAnthropicConfigured` from `src/lib/anthropic.ts` (line 53)
- `createNotification` from `src/lib/db/queries/notifications.ts` (line 8) — takes `{ userId, type, reportId, message }`, `reportId` is required (string)
- `getCachedData` from `src/lib/db/queries/qbo-cache.ts` (line 12)
- `EXPENSE_CATEGORIES` from `src/lib/categories.ts` (line 20)

### Step 7: Wire Up Route — `src/app/api/email/inbound/route.ts` (MODIFY)

Replace lines 73-79 (Phase 13 scaffold log) with:
```typescript
const result = await processInboundEmail(rawEmail, sesNotification.messageId)
console.log('[email/inbound] Processing result:', result)
return NextResponse.json({ status: result.status, messageId: sesNotification.messageId })
```

Add `processInboundEmail` to the import from `@/lib/email`.

### Step 8: Update Exports — `src/lib/email/index.ts` (MODIFY)

Add exports for `parseMimeEmail`, `getReceiptAttachments`, `processInboundEmail`, and their types.

### Step 9: Update Tests

**`src/app/api/email/inbound/__tests__/route.test.ts`**: Add `processInboundEmail` to the `@/lib/email` mock. Update Notification test case to verify pipeline is called with `(rawEmail, messageId)` and returns appropriate status.

**`src/lib/email/__tests__/parse.test.ts`** (NEW): Test `parseMimeEmail` with a minimal raw MIME fixture. Verify sender, subject, body, attachment extraction.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canonical message ID | SES `messageId` (not MIME `Message-ID`) | Guaranteed unique, matches SNS retry dedup |
| Attachment processing | First receipt attachment only | Simplifies Phase 14; multi-attachment support can iterate |
| PDF extraction | Upload only, no extraction | Claude Vision image API doesn't accept PDFs directly |
| HTML-only emails | Create draft with `amount: '0.00'` | EP2: always create. User fills in manually. |
| Expense type for email | Separate `CreateEmailExpenseInput` | Avoids polluting UI form type `CreateExpenseInput` |
| Report reuse | Only reuse `open` "Emailed Receipts" reports | Don't add expenses to submitted/approved reports |
| Error handling | Catch all, continue creating expense | EP2: "Always Create, Never Block" |

---

## Verification Checklist

1. `npx vitest run` — all tests pass
2. `npx tsc --noEmit` — no type errors
3. Deploy to Vercel
4. **Test: image attachment** — send email with receipt image from Gmail → verify "Emailed Receipts" report created with expense containing extracted merchant/amount/date
5. **Test: no attachment** — send plain text email → verify draft expense with $0.00 and subject as memo
6. **Test: idempotency** — send same email (or trigger SNS retry) → verify no duplicate expense, logs show "skipped"
7. **Test: unrecognized sender** — send from non-registered email → verify `sender_unrecognized` in logs, no expense created
8. **Test: PDF attachment** — send email with PDF → verify receipt uploaded to Blob, expense created (no extraction)

---

## What Phase 14 Does NOT Include (deferred to Phase 15+)

- Auto-reply to unrecognized senders (Phase 15)
- Secondary email CRUD UI (Phase 15)
- Rate limiting for auto-replies (Phase 15)
- Multi-attachment processing
- PDF receipt extraction
- HTML-to-image conversion for extraction
