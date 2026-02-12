# Implementation Plan: Email Receipts Feature

> **Overview**: Add email as a new receipt input channel, reusing the existing Claude Vision extraction, expense creation, and notification infrastructure. Continues from Phase 12 of the main implementation plan.

## Prerequisites

- [x] requirements_email_receipts.md (from /kickoff)
- [x] design_email_receipts.md (from /kickoff)
- [x] technology_decisions.md (updated with D7, D11–D14)
- [x] Existing Phases 1–11 implemented (auth, DB, expenses, Claude Vision, notifications, etc.)
- [ ] AWS account access (user confirmed existing account)
- [ ] DNS access for `expenses.renewalinitiatives.org` subdomain

---

## Phase 13: AWS Infrastructure & Webhook Scaffold

**Goal**: Stand up the AWS email pipeline and verify emails flow end-to-end from SES to the Vercel app.

**Tasks**:

1. DB migration: add `source`, `email_received_at`, `email_message_id`, `duplicate_flag` columns to `expenses` table
2. DB migration: create `user_emails` table (secondary email addresses)
3. DB migration: create `email_auto_replies` table (rate limiting)
4. DB migration: extend notification type enum with `email_receipt_processed` and `email_sender_unrecognized`
5. Create `/api/email/inbound` POST route (webhook handler scaffold)
6. Implement SNS message signature verification (D13) in the webhook handler
7. Handle SNS subscription confirmation (required before SNS will deliver messages)
8. On valid notification: fetch raw email from S3 using AWS SDK, log email metadata (sender, subject, size)
9. Document AWS setup steps (SES receipt rule, S3 bucket, SNS topic, IAM policies, MX record) — user performs manually
10. Install `postal-mime` and `@aws-sdk/client-s3` dependencies

**Deliverable**: Forward an email to `receipts@expenses.renewalinitiatives.org` → SES stores in S3 → SNS notifies webhook → app logs email metadata. End-to-end pipeline validated (assumption A5).

**External Setup Required** (user performs):
- Create S3 bucket for email storage
- Configure SES receipt rule set on `expenses.renewalinitiatives.org` subdomain
- Create SNS topic and subscribe Vercel webhook URL
- Set MX record on subdomain pointing to SES
- Create IAM user/role with S3 read + SES send permissions
- Add AWS credentials to Vercel environment variables

---

## Phase 14: Email Processing Pipeline

**Goal**: Parse forwarded emails, extract receipt data via existing Claude Vision pipeline, and create draft expenses.

**Tasks**:

1. Parse raw MIME email with `postal-mime`: extract sender address, HTML body, plain text body, PDF/image attachments
2. Implement sender verification: look up sender email against Zitadel user primary emails (secondary emails added in Phase 15)
3. For PDF attachments: upload to Vercel Blob (reuse existing receipt upload logic), pass to existing Claude Vision extraction
4. For HTML-only emails (no PDF): pass HTML text content to Claude Vision as text input for extraction, store raw HTML in Vercel Blob as audit artifact
5. Reuse existing extraction response handling: confidence scores, category suggestion, field mapping
6. Implement find-or-create "Emailed Receipts" report: query for user's Open report with that name, create if not found (reuse existing report creation logic)
7. Create expense line on the report with extracted fields, `source='email'`, `email_received_at`, `email_message_id` (reuse existing expense creation logic)
8. Implement duplicate detection: match amount + merchant + date against user's existing draft expenses, set `duplicate_flag` if match found
9. Flag incomplete extractions: if any required field (amount, date, merchant) has low confidence or is missing, mark expense for user review with email datetime
10. Create in-app notification: "Your emailed receipt from [merchant] ([amount]) was added to your Emailed Receipts report" (reuse existing `createNotification` with new type)
11. Add webhook idempotency: check `email_message_id` to skip duplicate SNS deliveries
12. Display email-sourced expenses in UI: source badge ("email" vs "camera"), duplicate warning, incomplete extraction flag

**Deliverable**: Forward a receipt email → system parses, extracts, creates draft expense with receipt attached → user sees it on their "Emailed Receipts" report with notification.

---

## Phase 15: Secondary Emails & Sender Management

**Goal**: Enable users to register secondary email addresses and handle unrecognized senders gracefully.

**Tasks**:

1. Create secondary email API routes: CRUD for `user_emails` table (add, list, remove)
2. Add secondary email management to user profile/settings page: show primary (Zitadel, read-only) + editable secondary list
3. Implement uniqueness validation: no duplicate emails across all users (case-insensitive)
4. Add admin capability: admin users can manage secondary emails for any user
5. Update sender verification (Phase 14) to check secondary emails in addition to Zitadel primary
6. Implement SES outbound auto-reply for unrecognized senders: app name only, no link, instruction to log in and add email
7. Implement auto-reply rate limiting: check `email_auto_replies` table, max one reply per sender per 24 hours
8. Create admin notification for unrecognized senders: "Email from unknown sender [address] received" (using `email_sender_unrecognized` notification type)
9. Add `AWS_SES_FROM_ADDRESS` environment variable for outbound auto-replies (e.g., `noreply@expenses.renewalinitiatives.org`)

**Deliverable**: Users can register secondary emails in profile. Forwarding from any registered email works. Unrecognized senders get auto-reply + admins are notified.

---

## Phase 16: Email Receipts Testing & Polish

**Goal**: Comprehensive testing of the email receipts pipeline and UI polish.

**Tasks**:

1. Unit tests: MIME parsing with sample emails (Stripe HTML, PDF-only, mixed, edge cases)
2. Unit tests: sender verification (primary match, secondary match, case-insensitive, no match)
3. Unit tests: duplicate detection logic (match, no match, partial match)
4. Unit tests: auto-reply rate limiting (within window, outside window)
5. Integration tests: webhook handler end-to-end (mock S3 fetch, mock Claude Vision, verify expense created)
6. Integration tests: unrecognized sender flow (verify auto-reply called, admin notified, no expense created)
7. Integration tests: find-or-create "Emailed Receipts" report (singleton behavior, create-after-submit)
8. Integration tests: secondary email CRUD (add, remove, uniqueness constraint)
9. E2E tests: secondary email management in user profile
10. E2E tests: email-sourced expense displays correctly (source badge, duplicate flag, receipt artifact)
11. E2E tests: notification appears for processed receipt
12. Manual testing: forward real Stripe receipt from Fastmail (end-to-end)
13. Manual testing: forward PDF-only receipt
14. Manual testing: forward from unregistered email (verify auto-reply)
15. Manual testing: forward same receipt twice (verify duplicate flag)

**Deliverable**: All email receipt functionality tested. Feature ready for production use.

---

## Phase Dependencies

```
Existing Phases 1–11 (all complete)
         │
         ▼
Phase 13 (AWS Infrastructure & Webhook)
         │
         ▼
Phase 14 (Email Processing Pipeline)
         │
         ▼
Phase 15 (Secondary Emails & Sender Management)
         │
         ▼
Phase 16 (Testing & Polish)
```

All phases are sequential — each builds on the previous. No parallelism needed given the small scope.

---

## Risk Areas & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| AWS SES setup complexity (IAM, SES rules, MX records) | Medium | Document step-by-step; this is one-time setup; well-documented by AWS |
| SNS message format / subscription confirmation | Low | Handle SubscriptionConfirmation message type in webhook; AWS docs cover this |
| MIME parsing edge cases (non-Stripe receipts) | Low | `postal-mime` handles standard MIME; Stripe receipts are well-structured; flag edge cases for manual entry |
| Claude Vision accuracy on HTML text input | Low | Stripe HTML is highly structured; existing pipeline already works for images; HTML as text may be even more accurate |
| DNS propagation delay for MX record | Low | Plan for 24-48 hours; test with `dig MX` before expecting emails |
| Vercel serverless function timeout on large emails | Low | Most receipt emails are small; Vercel allows 60s on Pro plan; 10s should suffice |

---

## Reuse Inventory

Explicit mapping of what's reused from existing codebase:

| Existing Code | Reused In | How |
|--------------|-----------|-----|
| Claude Vision extraction (Phase 4) | Phase 14 | Same API call, prompt, confidence scoring for PDF receipts; text input variant for HTML |
| Vercel Blob upload (Phase 3) | Phase 14 | Same upload flow for PDF/image receipt artifacts |
| Expense creation logic (Phase 3) | Phase 14 | Same DB insert, validation, field mapping |
| Report creation logic (Phase 2) | Phase 14 | Find-or-create "Emailed Receipts" report |
| Notification system (Phase 9) | Phase 14, 15 | Same `createNotification`, new types added |
| Zitadel user lookup (Phase 1) | Phase 14 | Sender email → user_id resolution |
| Settings page (Phase 11) | Phase 15 | Add secondary emails section to existing settings/profile |

---

## Success Criteria

- [ ] Forward a Stripe receipt email → draft expense created with accurate extraction
- [ ] Forward a PDF-only receipt → PDF stored, data extracted
- [ ] Forward from unregistered email → auto-reply sent, admin notified
- [ ] Duplicate forward detected and flagged
- [ ] Secondary emails configurable in user profile
- [ ] All correctness properties (ECP1–ECP5) verified by tests
- [ ] Total AWS cost under $1/month
- [ ] No changes to existing camera capture or approval workflows
