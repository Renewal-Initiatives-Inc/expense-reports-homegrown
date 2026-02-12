# Design: Email Receipts Feature

> **System design for inbound email receipt processing, extending the existing expense management application.**

## 1. Overview

### 1.1 Problem Statement

Emailed receipts from SaaS vendors and digital services require a tedious manual workflow — save email, create expense, attach file, toggle back and forth to transcribe fields — despite the app already having Claude Vision extraction for camera-captured receipts. The same AI-powered extraction should apply to forwarded email receipts.

### 1.2 Solution Approach

Add email as a new input channel feeding the existing AI-assisted, human-confirmed expense creation workflow:

1. AWS SES receives forwarded emails on a subdomain (no DNS conflict with Fastmail)
2. Raw email stored in S3, webhook triggers processing in the Vercel app
3. MIME parsed to extract HTML body and PDF attachments
4. **Existing** Claude Vision pipeline extracts receipt data
5. **Existing** expense creation logic adds a draft expense to the user's "Emailed Receipts" report
6. **Existing** notification system alerts the user
7. User reviews, edits if needed, submits when ready — **existing** workflow unchanged

### 1.3 Architecture Extension

```
                                    ┌─────────────────────────────────────────┐
                                    │         expense-reports-homegrown       │
                                    │                (Vercel)                 │
                                    │                                        │
  User forwards email               │  ┌────────────────────────────────┐   │
       │                            │  │  POST /api/email/inbound       │   │
       ▼                            │  │  (webhook handler)             │   │
┌──────────────┐                    │  │                                │   │
│   AWS SES    │   store raw MIME   │  │  1. Authenticate webhook      │   │
│   Inbound    │──────────────┐     │  │  2. Fetch email from S3       │   │
│  (MX record) │              │     │  │  3. Verify sender             │   │
└──────┬───────┘              │     │  │  4. Parse MIME                │   │
       │                      ▼     │  │  5. Extract via Claude Vision │◀──REUSE
       │               ┌──────────┐ │  │  6. Create draft expense     │◀──REUSE
       │               │  AWS S3  │ │  │  7. Notify user              │◀──REUSE
       │               │  (MIME)  │ │  │  8. Store receipt artifact   │◀──REUSE
       │               └──────────┘ │  └────────────────────────────────┘   │
       │                      │     │                                        │
       │   SNS notification   │     │  Existing infrastructure:              │
       └──────────────────────┼────▶│  - Vercel Blob (receipt storage)      │
                              │     │  - Neon DB (expenses, reports)         │
                              │     │  - Claude Vision API                   │
                              │     │  - Notification system                 │
                              │     └─────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │  Auto-reply via    │
                    │  SES Outbound      │
                    │  (unrecognized     │
                    │   senders only)    │
                    └────────────────────┘
```

---

## 2. Key Design Principles

### EP1: New Input Channel, Same Pipeline

Email is just another way to get a receipt image into the existing extraction → draft → review → submit workflow. No parallel processing paths. The Claude Vision prompt, confidence scoring, category suggestion, and expense creation logic are reused as-is.

### EP2: Always Create, Never Block

Every processed email results in an expense line — even if extraction is partial or fails entirely. The user fixes what the AI missed. No quarantine queues, no retry workflows, no admin intervention required.

### EP3: Minimal New Infrastructure

AWS SES for inbound/outbound email and S3 for raw storage are the only new infrastructure. Everything else — database, blob storage, auth, notifications — reuses what exists.

### EP4: Consistent with P2 (AI-Assisted, Human-Confirmed)

Email-sourced expenses follow the same design principle as camera-captured receipts: AI extracts and suggests, human confirms and submits. The "Emailed Receipts" report is a staging area, not an auto-submit pipeline.

---

## 3. Technology Approach

> **Note**: Detailed technology decisions for MIME parsing library and AWS SES configuration will be made during `/tech-stack`.

### 3.1 New Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Inbound Email | AWS SES (us-east-1 or us-west-2) | Receive emails on `expenses.renewalinitiatives.org` subdomain |
| Email Storage | AWS S3 | Store raw MIME for processing |
| Event Trigger | AWS SNS → Vercel webhook | Notify app of new email |
| Outbound Email | AWS SES | Auto-reply to unrecognized senders |
| MIME Parsing | TBD (`mailparser` or `postal-mime`) | Extract HTML, text, and attachments from raw email |

### 3.2 Reused Infrastructure

| Component | Already Built | How It's Reused |
|-----------|--------------|----------------|
| Claude Vision extraction | R13 (Receipt Image Processing) | Same API call, same prompt, same confidence scoring |
| Expense creation | R3 (Out-of-Pocket Expense Entry) | Same DB insert, same validation, same fields |
| Report management | R2 (Expense Report Management) | Find-or-create "Emailed Receipts" report in Open status |
| Receipt storage | Vercel Blob | Same upload flow for PDF/image artifacts |
| Notifications | R11 (In-App Notifications) | New notification type, same creation and display infrastructure |
| Category suggestion | R5, R13 | Same QBO category matching from extraction |
| Auth / user lookup | R1 (User Authentication) | Zitadel user data for sender verification |

---

## 4. Correctness Properties

### ECP1: Sender Attribution Integrity

**Property**: For any email-sourced expense E, E.report.user_id must correspond to the user whose primary or secondary email matches the sender address of the originating email.

**Validates**: ER2 (Sender Verification), ER6 (Secondary Email Addresses)

### ECP2: Receipt Artifact Presence

**Property**: For any email-sourced expense E, at least one receipt artifact (PDF, image, or stored HTML) must be linked to E.

**Validates**: ER4 (Draft Expense Creation)

### ECP3: Emailed Receipts Report Singleton

**Property**: For any user U, at most one expense report with name "Emailed Receipts" and status Open may exist at any time. (Once submitted, a new one can be created for subsequent emails.)

**Validates**: ER4 (Draft Expense Creation)

### ECP4: Email Uniqueness in Allowlist

**Property**: For any email address A in the sender allowlist, A maps to exactly one user. No two users may claim the same email address (primary or secondary).

**Validates**: ER2 (Sender Verification), ER6 (Secondary Email Addresses)

### ECP5: Duplicate Warning Consistency

**Property**: For any email-sourced expense E flagged as "possible duplicate," there exists at least one other expense E' belonging to the same user where E.amount = E'.amount AND E.merchant = E'.merchant AND E.date = E'.date.

**Validates**: ER5 (Duplicate Detection)

---

## 5. Business Logic Flows

### 5.1 Email Receipt Processing (End-to-End)

```
User forwards receipt email
to receipts@expenses.renewalinitiatives.org
     │
     ▼
┌─────────────────────┐
│ AWS SES receives    │
│ Stores MIME in S3   │
│ Sends SNS to app    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Webhook handler     │
│ Authenticate request│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     No     ┌──────────────────────┐
│ Verify sender email │───────────▶│ Auto-reply to sender │
│ against allowlist   │            │ Notify admins        │
└──────────┬──────────┘            │ Stop processing      │
           │                       └──────────────────────┘
           │ Yes
           ▼
┌─────────────────────┐
│ Parse MIME          │
│ Extract HTML body   │
│ Extract attachments │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Run extraction (REUSE EXISTING) │
│ - PDF attachment → Claude Vision│
│ - HTML body → Claude Vision     │
│ - Extract merchant, amount,     │
│   date, category                │
│ - Score confidence              │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Store receipt artifact          │
│ (REUSE Vercel Blob upload)      │
│ - PDF as-is if available        │
│ - HTML stored if no PDF         │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Find or create "Emailed         │
│ Receipts" report for user       │
│ (REUSE report creation logic)   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Check for duplicates            │
│ (amount + merchant + date)      │
│ Flag if match found             │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Create expense line             │
│ (REUSE expense creation)        │
│ - Pre-fill extracted fields     │
│ - Set source = "email"          │
│ - Attach receipt artifact       │
│ - Flag if extraction incomplete │
│ - Record email received datetime│
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Send in-app notification        │
│ (REUSE notification system)     │
│ "Your emailed receipt from      │
│  [merchant] ($XX) was added to  │
│  your Emailed Receipts report"  │
└─────────────────────────────────┘
```

### 5.2 Secondary Email Management

```
User opens Profile/Settings
     │
     ▼
┌─────────────────────┐
│ View current emails: │
│ - Primary (Zitadel)  │
│   [read-only]        │
│ - Secondary emails   │
│   [add/remove]       │
└──────────┬──────────┘
           │
           │ User adds email
           ▼
┌─────────────────────┐     Taken    ┌──────────────────┐
│ Check uniqueness    │─────────────▶│ Error: "This     │
│ across all users    │              │ email is already │
│                     │              │ registered"      │
└──────────┬──────────┘              └──────────────────┘
           │
           │ Unique
           ▼
┌─────────────────────┐
│ Save to user_emails  │
│ table                │
└─────────────────────┘
```

### 5.3 Unrecognized Sender Flow

```
Email received from unknown address
     │
     ▼
┌─────────────────────────────────┐
│ Check: auto-reply sent to this  │
│ address in last 24 hours?       │
└──────────┬──────────────────────┘
           │
     ┌─────┴─────┐
     │           │
    Yes          No
     │           │
     ▼           ▼
  [Skip       ┌─────────────────────┐
   reply]     │ Send auto-reply via │
     │        │ SES outbound:       │
     │        │ "Your email was not │
     │        │ recognized. Log into│
     │        │ [App Name] to add   │
     │        │ this email address."│
     │        └──────────┬──────────┘
     │                   │
     └─────────┬─────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Notify all admins (in-app):     │
│ "Email from unknown sender      │
│  jane.doe@gmail.com received"   │
└─────────────────────────────────┘
```

---

## 6. Error Handling Strategy

### 6.1 Error Categories

| Category | Example | Handling | User Impact |
|----------|---------|----------|-------------|
| **Unrecognized sender** | Email from address not in allowlist | Auto-reply + admin notification | Sender gets guidance; email not processed |
| **MIME parse failure** | Corrupted or unsupported email format | Create expense with no extracted data, flag as incomplete | User sees blank expense with email datetime for manual entry |
| **Extraction failure** | Claude Vision can't read receipt | Create expense with partial/no data, flag incomplete fields | User fills in manually; receipt artifact still attached |
| **Duplicate detected** | Same amount + merchant + date | Create expense with "possible duplicate" flag | User decides whether to keep or delete |
| **S3 fetch failure** | Can't retrieve raw email from S3 | Log error, return 500 to webhook (SNS will retry) | Transient — automatic retry via SNS |
| **Webhook auth failure** | Invalid or missing auth token | Reject with 401, log attempt | No user impact (security event) |

### 6.2 Principle: Always Create

Per EP2, the system always creates an expense line when a verified sender's email is received. Extraction failures result in flagged, incomplete expenses — never dropped emails. The email received datetime is always recorded so the user can find the original email.

---

## 7. Data Model Extensions

### 7.1 Changes to Existing Tables

**expenses** — add fields:

```
+ source (text, default 'camera')          -- 'camera' | 'email'
+ email_received_at (timestamp, nullable)  -- when the email was received by SES
+ email_message_id (text, nullable)        -- Message-ID header for dedup reference
+ duplicate_flag (boolean, default false)  -- soft duplicate warning
```

**notifications** — extend type enum:

```
  existing: 'report_submitted' | 'report_approved' | 'report_rejected'
+ add:      'email_receipt_processed' | 'email_sender_unrecognized'
```

### 7.2 New Tables

```
user_emails
├── id (uuid, PK)
├── user_id (text, FK conceptual → Zitadel user)
├── email (text, unique, stored lowercase)
├── created_at (timestamp)
└── updated_at (timestamp)

email_auto_replies
├── id (uuid, PK)
├── sender_email (text, stored lowercase)
├── sent_at (timestamp)
└── created_at (timestamp)

Index: (sender_email, sent_at) for 24-hour rate limit lookups
```

### 7.3 No New Tables For

- **Email processing queue** — not needed; webhook processes synchronously, SNS retries on failure
- **Email audit log** — not needed per requirements; receipt artifact on expense is the audit trail
- **Pipeline status** — not needed; no admin dashboard for pipeline

---

## 8. Testing Strategy

### 8.1 Unit Tests (Vitest)

- MIME parsing: verify extraction of HTML body, text body, PDF attachments from sample emails
- Sender verification: match against primary + secondary emails, case-insensitive
- Duplicate detection: matching logic for amount + merchant + date
- Auto-reply rate limiting: 24-hour window enforcement

### 8.2 Integration Tests (Vitest + MSW)

- Webhook handler end-to-end: mock S3 fetch, mock Claude Vision, verify expense created
- Unrecognized sender: verify auto-reply triggered and admin notified
- Find-or-create "Emailed Receipts" report: verify singleton behavior
- Secondary email CRUD: add, remove, uniqueness constraint

### 8.3 E2E Tests (Playwright)

- Secondary email management in user profile/settings
- Verify email-sourced expenses appear on "Emailed Receipts" report with correct data
- Verify duplicate flag displays on expense line
- Verify notification appears for processed receipt

### 8.4 Manual Testing

- Forward real Stripe receipt from Fastmail → verify end-to-end extraction
- Forward non-Stripe PDF receipt → verify PDF stored and extracted
- Forward from unregistered email → verify auto-reply received
- Forward same receipt twice → verify duplicate flag

---

## 9. Security Considerations

### 9.1 Webhook Authentication

- Incoming webhooks from AWS SNS must be verified (SNS message signature validation or shared secret header)
- Reject all requests that fail authentication

### 9.2 Email Content Safety

- Email HTML is parsed server-side only; never rendered in the browser as raw HTML
- Attachments are validated for type (PDF, image) and size before processing
- Receipt artifacts stored in Vercel Blob with signed URLs (consistent with existing receipt storage)

### 9.3 Sender Verification

- Sender allowlist prevents unauthorized expense creation
- Auto-reply rate limiting prevents the system from being used as an email amplification vector
- No links in auto-replies to prevent phishing bootstrapping

### 9.4 Secondary Email Addresses

- Uniqueness constraint prevents two users from claiming the same email (attribution integrity)
- Users can only manage their own secondary emails (admins can manage any user's)

---

## 10. Open Design Questions

To be resolved during `/tech-stack` and implementation:

1. **MIME parsing library**: `mailparser` (most popular, full-featured) vs `postal-mime` (modern, smaller) vs other?
2. **AWS region for SES**: US East (Virginia) vs US West (Oregon) — latency to Vercel?
3. **SNS → webhook vs Lambda intermediary**: Direct SNS to Vercel webhook is simpler; Lambda adds processing control but complexity and cost.
4. **HTML receipt rendering**: For HTML-only receipts (no PDF), store raw HTML? Render to PDF server-side? Store as screenshot?
5. **Webhook idempotency**: SNS may deliver the same message multiple times. Use `email_message_id` to deduplicate at the handler level?
