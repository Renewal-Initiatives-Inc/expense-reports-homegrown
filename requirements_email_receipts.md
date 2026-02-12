# Requirements: Email Receipts Feature

> **Enable users to forward emailed receipts to a dedicated address for AI-powered extraction, reusing the existing Claude Vision pipeline and expense management workflow.**

## 1. Introduction

### 1.1 Feature Context

This is an additive feature for the existing Expense Reports Homegrown application. Employees receive receipts via email from SaaS vendors (Vercel, Anthropic, OpenAI), domain hosting, conferences, etc. Today, getting those receipts into the system requires saving the email as a file, creating an expense, attaching the file, and manually transcribing vendor/amount/date/tax — despite the app already having Claude Vision extraction for camera-captured receipts.

This feature adds email as a new input channel feeding the same AI-assisted, human-confirmed workflow.

### 1.2 What We're Building

An inbound email pipeline where employees forward receipt emails to `receipts@expenses.renewalinitiatives.org`. The system verifies the sender, parses the email (HTML body + PDF attachments), extracts receipt data via the existing Claude Vision pipeline, and creates a draft expense on the user's "Emailed Receipts" report for review.

### 1.3 What We're NOT Building

- Changes to the existing camera capture flow
- Changes to the existing expense report workflow (submission, approval, QBO sync)
- Per-user or per-report email addresses
- Automated inbox scanning or IMAP connections
- Email notifications for report status changes (existing in-app notifications are sufficient)
- Admin dashboard for the email pipeline

### 1.4 Success Criteria

- Forward an email → get a pre-filled draft expense with receipt attached
- Works with Stripe-powered HTML receipts and PDF-only receipts
- Unrecognized senders are rejected with helpful guidance
- Total ongoing cost under $1/month at expected volume (5-10 emails/month)

---

## 2. Glossary

| Term | Definition |
|------|-----------|
| **Inbound Email** | An email received by the system at the dedicated receipts address |
| **Sender Allowlist** | The set of email addresses (primary + secondary) belonging to registered app users |
| **Secondary Email** | An alternate email address a user registers in their profile (e.g., personal email they might forward from) |
| **Emailed Receipts Report** | The auto-created draft expense report where email-sourced expenses land for each user |
| **Receipt Artifact** | The stored proof of purchase — a PDF attachment or rendered HTML from the email |
| **MIME** | Multipurpose Internet Mail Extensions — the format of raw email messages containing headers, body parts, and attachments |

---

## 3. Requirements

### ER1: Inbound Email Reception

**Traces to**: A5 (AWS SES → Vercel integration), A9 (no fixed monthly cost)

**User Story**: As a submitter, I want to forward receipt emails to a dedicated address, so that my expenses are captured without downloading files or switching between apps.

**Acceptance Criteria**:

1. THE System SHALL receive emails at `receipts@expenses.renewalinitiatives.org` via AWS SES
2. THE System SHALL store the raw email in S3 for processing
3. THE System SHALL trigger processing of the email via a webhook to the Vercel application
4. THE System SHALL authenticate incoming webhooks from AWS to prevent unauthorized submissions
5. THE System SHALL process emails asynchronously without blocking the webhook response

---

### ER2: Sender Verification

**Traces to**: A3 (sender allowlist with secondary emails)

**User Story**: As an admin, I want only recognized employees to submit expenses via email, so that the system is protected from spam and unauthorized submissions.

**Acceptance Criteria**:

1. THE System SHALL verify the sender's email address against the allowlist (Zitadel primary email + user-configured secondary emails)
2. THE System SHALL reject emails from unrecognized senders
3. THE System SHALL send an auto-reply to unrecognized senders stating the app name (not a link) and instructing them to log in and add their email address
4. THE System SHALL create an in-app notification for all admin users when an email from an unrecognized sender is received, including the sender address
5. THE System SHALL match sender addresses case-insensitively

---

### ER3: Email Parsing & Receipt Extraction

**Traces to**: A4 (Claude Vision accuracy on email formats), A6 (Fastmail forwarding fidelity — validated)

**User Story**: As a submitter, I want the system to automatically extract receipt data from my forwarded email, so that I don't have to manually enter vendor, amount, date, and category.

**Acceptance Criteria**:

1. THE System SHALL parse the MIME structure of forwarded emails to extract HTML body and file attachments
2. THE System SHALL identify PDF and image attachments as potential receipt documents
3. THE System SHALL extract receipt data using the existing Claude Vision pipeline, reusing the same extraction prompt, confidence scoring, and category suggestion logic already built for camera-captured receipts
4. THE System SHALL prefer PDF attachments as the extraction source when available; fall back to HTML body content when no attachments are present
5. THE System SHALL extract: merchant name, total amount, transaction date, and suggest an expense category
6. THE System SHALL return confidence scores for extracted fields, consistent with existing camera receipt extraction

---

### ER4: Draft Expense Creation

**Traces to**: A1 (receipt frequency justifies feature), A2 (single dedicated address)

**User Story**: As a submitter, I want my emailed receipts to appear as draft expenses ready for review, so that I can confirm and submit them at my convenience.

**Acceptance Criteria**:

1. THE System SHALL find or create an expense report named "Emailed Receipts" in Open status for the identified user
2. THE System SHALL create one expense line per processed email on that report
3. THE System SHALL pre-fill the expense with all successfully extracted fields (merchant, amount, date, category)
4. THE System SHALL store a receipt artifact on the expense line:
   - PDF attachment stored as-is if available
   - For HTML-only emails: store the HTML content or a rendered representation
   - THE System SHALL always ensure a receipt artifact exists on the expense line
5. THE System SHALL set the expense source as "email" to distinguish from camera-captured receipts
6. THE System SHALL record the email received timestamp on the expense
7. THE System SHALL flag expenses with incomplete extraction, displaying what was successfully parsed plus the email received datetime so the user can locate the original email
8. THE System SHALL create an in-app notification for the user: "Your emailed receipt from [merchant] ([amount]) was added to your Emailed Receipts report" (using existing notification infrastructure)

---

### ER5: Duplicate Detection

**Traces to**: A1 (receipt frequency)

**User Story**: As a submitter, I want to be warned if I accidentally forward the same receipt twice, so that I don't create duplicate expenses.

**Acceptance Criteria**:

1. THE System SHALL check for potential duplicates when creating an email-sourced expense by matching on amount + merchant + date within the user's existing draft expenses
2. THE System SHALL flag the new expense as "possible duplicate" when a match is found
3. THE System SHALL still create the expense (soft warning, not a hard block)
4. THE System SHALL display the duplicate warning visually on the expense line

---

### ER6: Secondary Email Addresses

**Traces to**: A3 (sender allowlist with secondary emails)

**User Story**: As a submitter, I want to register additional email addresses in my profile, so that I can forward receipts from any of my email accounts (work and personal).

**Acceptance Criteria**:

1. THE System SHALL allow users to add, view, and remove secondary email addresses in their profile/settings
2. THE System SHALL allow admin users to manage secondary email addresses for any user
3. THE System SHALL include secondary emails in the sender verification allowlist (ER2)
4. THE System SHALL prevent duplicate email addresses across all users (no two users may claim the same secondary email)
5. THE System SHALL store secondary emails case-insensitively

---

### ER7: Outbound Email (Auto-Reply)

**Traces to**: A3 (sender allowlist — error path)

**User Story**: As an employee who forwarded from an unrecognized email, I want to receive guidance on how to fix the issue, so that I can self-service without contacting an admin.

**Acceptance Criteria**:

1. THE System SHALL send a reply to unrecognized senders via AWS SES outbound
2. THE System SHALL include the application name and instruct the user to log in and add their email address
3. THE System SHALL NOT include a URL or link to the application (spam protection)
4. THE System SHALL send at most one auto-reply per unique sender address per 24-hour period (rate limiting to prevent abuse if spammed)

---

## 4. Out of Scope

- Per-user or per-report inbound email addresses
- Automated inbox scanning (JMAP, IMAP)
- Email notifications for report status changes
- Admin dashboard for the email ingestion pipeline
- Hard blocking of duplicate receipts
- Processing of non-receipt emails (newsletters, marketing, etc. — these will result in partial/failed extraction flagged for user review per ER4.7)

---

## 5. Technical Constraints

| Constraint | Value |
|-----------|-------|
| Email Receiving | AWS SES Inbound (subdomain MX record) |
| Email Storage | AWS S3 (raw MIME) |
| Receipt Artifact Storage | Vercel Blob (reuse existing) |
| Outbound Email | AWS SES (auto-reply only) |
| MIME Parsing | Node.js library (TBD during /tech-stack) |
| Receipt Extraction | Existing Claude Vision pipeline (reuse) |
| Expense Creation | Existing expense/report creation logic (reuse) |
| Notifications | Existing in-app notification system (reuse, extend types) |
| Budget | No fixed monthly cost; pay-per-use only |
| Volume | 5-10 emails/month |

---

## 6. Assumptions

| ID | Assumption | Status |
|----|-----------|--------|
| A1 | Emailed receipts are common enough to justify (5-10/month) | Confirmed |
| A2 | Single dedicated address is sufficient | Confirmed |
| A3 | Sender allowlist with secondary emails prevents spam and attributes correctly | To validate |
| A4 | Claude Vision accurately extracts from HTML receipts and PDF receipts | High confidence (existing pipeline works for camera receipts) |
| A5 | AWS SES → S3 → Vercel webhook pipeline works end-to-end | To validate (spike) |
| A6 | Fastmail forwarding preserves HTML + PDF attachments | **Validated** |
| A7 | Users will forward receipts rather than batch (acceptable either way) | Monitor |
| A8 | Claude Vision cost for 5-10 extractions/month is negligible | High confidence |
| A9 | No fixed monthly cost acceptable | Hard constraint |
