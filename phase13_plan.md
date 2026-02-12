# Phase 13 Execution Plan: AWS Infrastructure & Webhook Scaffold

> **Goal**: Stand up the AWS email pipeline and verify emails flow end-to-end from SES to the Vercel app.

## Prerequisites

- [x] Phases 1–11 implemented (auth, DB, expenses, Claude Vision, notifications, admin settings)
- [ ] AWS account access (user confirmed existing account)
- [ ] DNS access for `expenses.renewalinitiatives.org` subdomain

## Dependencies on Previous Phases (Verify Before Starting)

| Dependency | Phase | What to Verify |
|-----------|-------|---------------|
| Drizzle schema + migrations | Phase 2 | Schema in `src/lib/db/schema.ts`, migrations in `drizzle/` |
| Notification system | Phase 9 | `createNotification()` in `src/lib/db/queries/notifications.ts`, notification type enum |
| Expense creation logic | Phase 3 | Expense insert in `src/lib/db/queries/expenses.ts` |
| Receipt upload to Vercel Blob | Phase 3 | `uploadReceipt()` in `src/lib/blob.ts` |
| Claude Vision extraction | Phase 4 | `/api/receipts/process` route + extraction logic |

---

## Step 1: Install New Dependencies

**Files Modified**: `package.json`

Install:
- `postal-mime` — MIME email parsing (D12)
- `@aws-sdk/client-s3` — Fetch raw email from S3
- `@aws-sdk/client-ses` — Send auto-reply emails (needed in Phase 15, but install now)
- `sns-validator` — SNS message signature verification (D13)

```bash
npm install postal-mime @aws-sdk/client-s3 @aws-sdk/client-ses sns-validator
npm install -D @types/sns-validator
```

---

## Step 2: Database Migrations — Extend `expenses` Table

**Files Modified**: `src/lib/db/schema.ts`, new migration file

Add four columns to the existing `expenses` table:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `source` | `text` | `'camera'` | Distinguishes camera-captured vs email-sourced expenses |
| `emailReceivedAt` | `timestamp` | `null` | When SES received the email |
| `emailMessageId` | `text` | `null` | MIME Message-ID header for dedup/reference |
| `duplicateFlag` | `boolean` | `false` | Soft warning for potential duplicate |

**Schema change** (in `schema.ts`):
```typescript
// Add to expenses table definition:
source: text('source').default('camera').notNull(),
emailReceivedAt: timestamp('email_received_at', { withTimezone: true }),
emailMessageId: text('email_message_id'),
duplicateFlag: boolean('duplicate_flag').default(false).notNull(),
```

**Migration**: Run `npx drizzle-kit generate` then `npx drizzle-kit migrate`.

**Backward compatibility**: All existing expenses automatically get `source='camera'`, `duplicateFlag=false`, and null for email fields. No data migration needed.

---

## Step 3: Database Migrations — Create `user_emails` Table

**Files Modified**: `src/lib/db/schema.ts`, new migration file

New table for secondary email addresses:

```typescript
export const userEmails = pgTable('user_emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  email: text('email').notNull().unique(),        // Stored lowercase
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_emails_user_id_idx').on(table.userId),
  index('user_emails_email_idx').on(table.email),
]);
```

**Correctness property**: ECP4 — email uniqueness enforced by `unique()` constraint on `email` column.

---

## Step 4: Database Migrations — Create `email_auto_replies` Table

**Files Modified**: `src/lib/db/schema.ts`, new migration file

New table for rate-limiting auto-replies to unrecognized senders:

```typescript
export const emailAutoReplies = pgTable('email_auto_replies', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderEmail: text('sender_email').notNull(),    // Stored lowercase
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('email_auto_replies_sender_idx').on(table.senderEmail, table.sentAt),
]);
```

---

## Step 5: Extend Notification Type Enum

**Files Modified**: `src/lib/db/schema.ts`, `src/types/` (if notification types are defined there)

Add two new notification types to the existing enum:

| Type | Purpose | Used In |
|------|---------|---------|
| `email_receipt_processed` | Notify user when their forwarded receipt is processed | Phase 14 |
| `email_sender_unrecognized` | Notify admins when email from unknown sender arrives | Phase 15 |

**Current notification types** (in schema):
```typescript
// Currently: 'report_submitted' | 'report_approved' | 'report_rejected'
// Add: 'email_receipt_processed' | 'email_sender_unrecognized'
```

Update the notification type validation wherever it's enforced (Zod schema, TypeScript types).

---

## Step 6: Create Webhook Route — `/api/email/inbound`

**Files Created**: `src/app/api/email/inbound/route.ts`

This is the core of Phase 13. The webhook handler receives SNS notifications from AWS when a new email arrives.

### 6a: SNS Message Types

The handler must respond to three SNS message types:

1. **SubscriptionConfirmation** — AWS sends this when the SNS topic first subscribes to the webhook. Must respond by fetching the `SubscribeURL` to confirm.
2. **Notification** — The actual email event. Contains S3 bucket/key info for the raw email.
3. **UnsubscribeConfirmation** — Acknowledge unsubscription.

### 6b: Handler Pseudocode

```typescript
export async function POST(request: Request) {
  // 1. Read raw body
  const body = await request.text()
  const message = JSON.parse(body)

  // 2. Verify SNS signature (D13)
  //    - Use sns-validator to cryptographically verify the message
  //    - Reject with 401 if invalid
  //    - Validate signing cert URL is *.amazonaws.com

  // 3. Handle SubscriptionConfirmation
  //    - Fetch the SubscribeURL to confirm
  //    - Return 200

  // 4. Handle Notification
  //    - Parse the SNS message body (JSON string containing SES notification)
  //    - Extract S3 bucket and object key from the SES notification
  //    - Fetch raw email from S3 using @aws-sdk/client-s3
  //    - Log email metadata (sender, subject, size, message-id)
  //    - Return 200 (processing will be expanded in Phase 14)

  // 5. Handle UnsubscribeConfirmation
  //    - Log and return 200
}
```

### 6c: SNS Signature Verification

```typescript
import MessageValidator from 'sns-validator'

const validator = new MessageValidator()

async function verifySnsMessage(message: object): Promise<boolean> {
  return new Promise((resolve) => {
    validator.validate(message, (err) => {
      resolve(!err)
    })
  })
}
```

### 6d: S3 Email Fetch

```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_SES_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function fetchEmailFromS3(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await s3.send(command)
  return await response.Body!.transformToString()
}
```

### 6e: Response Codes

| Scenario | Status | Body |
|----------|--------|------|
| Valid SubscriptionConfirmation | 200 | `{ status: 'subscription_confirmed' }` |
| Valid Notification (processed) | 200 | `{ status: 'received' }` |
| Invalid signature | 401 | `{ error: 'Invalid signature' }` |
| Missing/malformed body | 400 | `{ error: 'Invalid request' }` |
| S3 fetch failure | 500 | `{ error: 'Processing failed' }` |

**Important**: Return 200 for successfully received notifications even if downstream processing fails (to prevent SNS retries for permanent errors). Log errors for investigation. In Phase 14, we'll add proper error handling with the "always create" principle.

---

## Step 7: Environment Variables

**Files Modified**: `.env.example`, `.env.local`

Add new environment variables:

```env
# AWS Email Pipeline (Phase 13)
AWS_ACCESS_KEY_ID=                    # IAM user with S3 read + SES send
AWS_SECRET_ACCESS_KEY=
AWS_SES_REGION=us-east-1              # Must match SES receiving region
AWS_S3_EMAIL_BUCKET=                  # S3 bucket for raw email storage
AWS_SES_FROM_ADDRESS=                 # noreply@expenses.renewalinitiatives.org (Phase 15)
```

---

## Step 8: Create Email Processing Utility Module

**Files Created**: `src/lib/email/index.ts`

Create a utility module that will house email processing functions. In Phase 13, this contains:

```typescript
// src/lib/email/index.ts

export { fetchEmailFromS3 } from './s3'
export { verifySnsMessage, parseSnsNotification } from './sns'

// Phase 14 will add:
// export { parseEmail } from './parser'
// export { verifySender } from './sender'
// export { processEmailReceipt } from './processor'
```

**Files Created**:
- `src/lib/email/s3.ts` — S3 client and email fetch function
- `src/lib/email/sns.ts` — SNS signature verification and message parsing

---

## Step 9: Create AWS Setup Documentation

**Files Created**: `docs/aws-email-setup.md`

Step-by-step guide for the user to perform the manual AWS setup:

### 9a: S3 Bucket

1. Create bucket (e.g., `renewal-expense-emails`)
2. Bucket policy: Allow SES to write objects
3. Lifecycle rule: Auto-delete objects after 30 days (raw emails are processed immediately; kept briefly for debugging)

### 9b: SES Receipt Rule

1. Verify domain `expenses.renewalinitiatives.org` in SES
2. Create receipt rule set
3. Add rule: recipient = `receipts@expenses.renewalinitiatives.org`
4. Actions: (1) Store in S3 bucket, (2) Publish to SNS topic

### 9c: SNS Topic

1. Create topic (e.g., `expense-email-inbound`)
2. Create HTTPS subscription pointing to `https://<app-url>/api/email/inbound`
3. Confirm subscription (webhook handler handles this automatically)

### 9d: IAM Permissions

1. Create IAM user or role
2. Policy: `s3:GetObject` on email bucket, `ses:SendEmail` / `ses:SendRawEmail` for auto-replies
3. Generate access key for Vercel env vars

### 9e: DNS (MX Record)

1. Add MX record for `expenses.renewalinitiatives.org` pointing to SES inbound endpoint:
   - `10 inbound-smtp.us-east-1.amazonaws.com` (adjust region)
2. Wait for DNS propagation (24-48 hours)

---

## Step 10: Write Tests

### 10a: Unit Tests

**Files Created**: `src/lib/email/__tests__/sns.test.ts`

| Test | Description |
|------|-------------|
| `verifySnsMessage` returns true for valid signature | Mock sns-validator to return no error |
| `verifySnsMessage` returns false for invalid signature | Mock sns-validator to return error |
| `parseSnsNotification` extracts S3 bucket and key from SES notification | Parse sample SNS notification JSON |
| `parseSnsNotification` handles malformed notification | Return null/error for bad JSON |

**Files Created**: `src/lib/email/__tests__/s3.test.ts`

| Test | Description |
|------|-------------|
| `fetchEmailFromS3` returns email content | Mock S3 client |
| `fetchEmailFromS3` throws on missing object | Mock S3 client with NoSuchKey error |
| `fetchEmailFromS3` throws on access denied | Mock S3 client with AccessDenied error |

### 10b: Integration Tests

**Files Created**: `src/app/api/email/inbound/__tests__/route.test.ts`

| Test | Description |
|------|-------------|
| Rejects request with invalid SNS signature | Send POST with bad signature → 401 |
| Handles SubscriptionConfirmation | Send valid SubscriptionConfirmation → 200, SubscribeURL fetched |
| Handles valid Notification | Send valid Notification with S3 info → 200, S3 fetch called, metadata logged |
| Handles malformed body | Send non-JSON → 400 |
| Handles S3 fetch failure | Mock S3 error → 500 |
| Handles UnsubscribeConfirmation | Send valid Unsubscribe → 200 |

### 10c: Database Migration Tests

| Test | Description |
|------|-------------|
| `expenses.source` defaults to `'camera'` | Insert expense without source → verify default |
| `expenses.emailReceivedAt` accepts timestamp | Insert expense with email timestamp |
| `expenses.emailMessageId` stores string | Insert expense with message ID |
| `expenses.duplicateFlag` defaults to false | Insert expense → verify default |
| `user_emails.email` enforces uniqueness | Insert duplicate email → verify constraint error |
| `user_emails.email` stored lowercase | Insert mixed-case → verify stored lowercase |
| `email_auto_replies` index works | Insert and query by sender + time range |

---

## File Summary

### Files Created (New)

| File | Purpose |
|------|---------|
| `src/app/api/email/inbound/route.ts` | Webhook handler for SNS notifications |
| `src/lib/email/index.ts` | Email module barrel export |
| `src/lib/email/s3.ts` | S3 client and email fetch |
| `src/lib/email/sns.ts` | SNS signature verification and parsing |
| `src/lib/email/__tests__/sns.test.ts` | SNS utility tests |
| `src/lib/email/__tests__/s3.test.ts` | S3 utility tests |
| `src/app/api/email/inbound/__tests__/route.test.ts` | Webhook route integration tests |
| `docs/aws-email-setup.md` | AWS setup guide for user |
| `drizzle/XXXX_add_email_fields.sql` | Migration: expenses table columns |
| `drizzle/XXXX_create_user_emails.sql` | Migration: user_emails table |
| `drizzle/XXXX_create_email_auto_replies.sql` | Migration: email_auto_replies table |

### Files Modified (Existing)

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add email columns to expenses; add user_emails and email_auto_replies tables |
| `src/types/` (notification types) | Add `email_receipt_processed` and `email_sender_unrecognized` types |
| `.env.example` | Add AWS environment variables |
| `package.json` | Add postal-mime, @aws-sdk/client-s3, @aws-sdk/client-ses, sns-validator |

---

## Acceptance Criteria Satisfied

| Requirement | Criteria | How Satisfied |
|------------|----------|---------------|
| ER1.1 | Receive emails at dedicated address via AWS SES | MX record + SES receipt rule (user setup) |
| ER1.2 | Store raw email in S3 | SES receipt rule stores in S3 (user setup) |
| ER1.3 | Trigger processing via webhook | SNS → `/api/email/inbound` route |
| ER1.4 | Authenticate incoming webhooks | SNS signature verification (D13) |
| ER1.5 | Process asynchronously | Webhook returns 200 immediately; processing in handler |

## Correctness Properties Addressed

| Property | How Addressed |
|----------|---------------|
| ECP4 (Email Uniqueness) | `user_emails.email` has `unique()` constraint |

---

## Execution Order

1. **Install dependencies** (Step 1)
2. **Database schema changes** (Steps 2–5) — all schema changes in one `drizzle-kit generate` cycle
3. **Create email utility modules** (Step 8) — s3.ts and sns.ts
4. **Create webhook route** (Step 6) — the main deliverable
5. **Add environment variables** (Step 7)
6. **Write tests** (Step 10)
7. **Create AWS setup docs** (Step 9) — user performs manual AWS setup
8. **End-to-end validation** — user forwards test email, verifies metadata logged

---

## Estimated Scope

- ~8 new files created
- ~4 existing files modified
- ~3 database migrations
- ~15 test cases
- No UI changes in this phase

## What This Phase Does NOT Include

- MIME email parsing (Phase 14)
- Receipt extraction from email content (Phase 14)
- Expense creation from email (Phase 14)
- Sender verification against allowlist (Phase 14)
- Secondary email management UI (Phase 15)
- Auto-reply to unrecognized senders (Phase 15)
- Any changes to existing expense or report workflows
