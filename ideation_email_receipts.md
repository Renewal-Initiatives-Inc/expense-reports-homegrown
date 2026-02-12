# Ideation: Email Receipts Feature

## Meta
- Status: Ready for Kickoff
- Last Updated: 2026-02-11
- Sessions: 3
- Scope: New feature for existing expense-reports-homegrown application

## 1. Origin
- **Entry Type**: Solution (backed by clear problem)
- **Initial Statement**: "Enable users to email in a receipt, since we get a lot of receipts emailed to us by vendors like software providers."
- **Refined Problem Statement**: Emailed receipts from SaaS vendors and other digital services require a tedious manual workflow — save email as file, create expense line, attach file, toggle back and forth between receipt and app to manually transcribe vendor/amount/date/tax into fields — despite the app already having Claude Vision extraction for camera-captured receipts. The same AI-powered extraction should apply to forwarded email receipts.

## 2. Jobs to be Done
- **Primary Job**: Get an emailed receipt into the expense report system with accurate data and minimal manual effort
- **Related Jobs**:
  - Keep receipts organized and attached to the correct expense report
  - Avoid procrastinating on expense submissions because the process is annoying
  - Maintain accurate records for QBO sync and audit trail
- **Current Alternatives**:
  - Open email, right-click save as PDF → open expense app → create new expense line → attach PDF → toggle between PDF and app to manually type vendor, amount, date, tax, category into fields (current workflow — tedious, error-prone)
  - Skip submitting the expense entirely (receipts fall through the cracks because the process is annoying enough to procrastinate)
- **Switching Triggers**: The feature would be a no-brainer adoption — the current process is universally hated. Zero friction to switch since it's additive (forward an email vs. download/upload/transcribe).

## 3. User Segments

### Segment 1: The Expense Submitter (all employees)
- **Context**: Receives emailed receipts from SaaS vendors (Vercel, Anthropic, OpenAI), domain hosting, conference registrations, parking fees, etc. A few per month per employee. Receipts are typically Stripe-powered HTML emails with structured data, often with PDF attachments.
- **Motivation**: Eliminate the tedious download-upload-transcribe loop. Forward an email, get a pre-filled expense. Done.
- **Ability Barriers**: Essentially none. Forwarding an email is a well-understood action. The only potential barrier is remembering the inbound email address (solved by saving it as a contact).
- **Potential Prompts**: Receiving a new receipt email from a vendor. End-of-month expense report deadline approaching with a backlog of unfiled emailed receipts.

### Segment 2: The Approver (admin users)
- **Context**: Reviews submitted expense reports. Currently sees expenses from emailed receipts that were manually transcribed (potential for typos, missed tax amounts, wrong dates).
- **Motivation**: AI-extracted data from forwarded emails will be more accurate than manual transcription, making approval faster and more reliable.
- **Ability Barriers**: None — this is transparent to the approver. They just see better-quality expense entries.
- **Potential Prompts**: N/A — benefit is passive (higher quality submissions).

## 4. Market Landscape

### Direct Competitors (email-to-expense feature)
| Competitor | How Email Receipts Work | Strengths | Weaknesses | Pricing |
|------------|------------------------|-----------|------------|---------|
| **Expensify** | Forward to `receipts@expensify.com`. SmartScan extracts merchant, date, amount, currency. | Pioneer of the pattern; robust AI extraction; supports any email provider | Full expense platform — can't use just the email feature standalone | Free personal; $5/user/mo business |
| **Ramp** | Forward to `receipts@ramp.com` or `reimbursements@ramp.com`. Matches receipts to card transactions. Auto-adds memo from email body. | Already used by Renewal Initiatives for card expenses; auto-match to transactions | Primarily designed for card transaction matching, not standalone receipt ingestion | Free with Ramp card |
| **SparkReceipt** | Forward from any email provider. AI scanning + categorization. Auto-forward rules supported. | Works with any email provider; line-item breakdown on Elite plan | Separate product — doesn't integrate with custom systems | Free tier; paid plans for advanced features |
| **ExpenseMonkey** | "Email to Expense" feature. Forward receipts, auto-extract date/amount/vendor/category. | Free receipt scanner; handles JPG, PDF, email formats | Standalone product; no custom integration | Free tier available |
| **Easy Expense** | Forward to `upload@easy-expense.com`. Must send from account-linked email. Alias support for other emails. | Simple sender verification model | Gmail-only import for auto-scanning; limited provider support | Free tier available |
| **FreshBooks** | Dedicated email address. Auto-tracks merchant, totals, taxes from forwarded receipts. | Clean integration with FreshBooks accounting | Tied to FreshBooks ecosystem | Starts at $19/mo |
| **Oracle Fusion Expenses** | Forward to admin-designated address. Verifies sender email against Oracle HCM Cloud. Extracts details, creates expense, attaches forwarded email as PDF. | Enterprise-grade; sender verification against HR system (same pattern we plan with Zitadel) | Enterprise complexity and cost | Enterprise pricing |

### Indirect Competitors / Alternatives
| Solution | How it's used for this job | Gap it leaves |
|----------|---------------------------|---------------|
| **Ramp card adoption** | Moving vendor payments to Ramp card eliminates need for email receipt forwarding entirely | Only works for card-eligible expenses; some vendors (conferences, parking) don't support card payment |
| **Receiptor AI** | Third-party tool that monitors inbox and auto-forwards receipts to Expensify | Requires Expensify; doesn't work with custom systems |
| **CloudHQ Multi Email Forward** | Chrome extension for bulk-forwarding receipts from Gmail | Gmail-only; manual trigger; no extraction |
| **Manual download + upload** | Current workflow: save email as PDF, upload to app, manually transcribe | Tedious, error-prone, causes procrastination |

### Technical Approaches for Inbound Email (within budget)
| Service | How It Works | Cost at 5-10 emails/mo | Pros | Cons |
|---------|-------------|------------------------|------|------|
| **AWS SES Inbound** (preferred) | MX record for subdomain → SES receives → S3 stores raw email → triggers Lambda/SNS → app processes | **~$0.01/mo** at this volume | Pay-per-use; robust; user already has AWS account; no DNS conflicts | Complex initial setup (SES + S3 + IAM policies); multi-service orchestration |
| **Cloudflare Email Workers** | Email routing → Worker processes email → POSTs to app webhook | **Free** (100k req/day free tier) | Zero cost; programmable | Requires domain DNS on Cloudflare — **conflicts with existing Fastmail and Wix DNS hosting**; hassle factor ≥ AWS |
| **Resend Inbound** | MX record → Resend receives → webhook POST with parsed JSON + attachments | **Free** (3k emails/mo free tier) | Modern DX; webhook-based | **User has had bad experiences with Resend**; newer product; 1-day log retention on free |

**Recommended: AWS SES Inbound** — One-time setup pain, essentially free ongoing, no DNS conflicts, user already has an AWS account. The setup complexity is a solvable problem (well-documented, one-time effort). The monthly cost and infrastructure conflicts of alternatives are ongoing problems.

**Eliminated options** (fixed monthly cost exceeds budget):
- SendGrid Inbound Parse ($19.95/mo minimum)
- Postmark Inbound ($15/mo)
- Mailgun Inbound Routes ($35/mo)

### Market Signals
- Email-to-expense is table-stakes functionality — every major expense tool supports it
- The pattern is well-proven: single address → sender verification → AI extraction → draft expense
- Resend launched inbound email as their "most requested feature" in 2025, signaling demand for developer-friendly inbound processing
- Cloudflare Email Workers enable completely free email processing, democratizing what used to require paid email services

### Opportunity Gaps
1. **No standalone email-to-expense for custom apps**: Every competitor's email feature is locked inside their product. If you have your own expense system, you must build the ingestion pipeline yourself — but the pattern is proven and the technical building blocks are free/cheap.
2. **Existing Claude Vision pipeline is reusable**: The app already does AI extraction for camera receipts. Email receipts are just a new input channel feeding the same pipeline — the hardest part (extraction + categorization) is already built.
3. **Zitadel provides natural sender verification**: Oracle verifies against HCM Cloud, Expensify verifies against account email. Our Zitadel identity system gives us the same capability for free — no additional auth infrastructure needed.

## 5. Assumptions Log

| ID | Assumption | Category | Importance | Confidence | Evidence | Validation Strategy |
|----|------------|----------|------------|------------|----------|---------------------|
| A1 | Emailed receipts are common enough to justify building this feature (a few per employee per month) | Problem | High | High | User confirmed 5-10 emails/month total; screenshots show real Vercel, Anthropic receipts | Already validated via user interview |
| A2 | A single dedicated email address is sufficient (no per-user or per-report addresses needed) | Solution | Medium | High | User explicitly chose this; ~8 employees, low volume; matches Expensify/Ramp pattern | Already validated via user decision |
| A3 | Sender allowlist reliably prevents spam and attributes expenses to the correct user | Solution | High | Medium | Oracle uses same pattern (verify work email in HCM Cloud); Expensify verifies account email. **Confirmed risk**: users may forward from personal email addresses not registered in Zitadel. Mitigation: support multiple email addresses per user (secondary emails in app user profile or Zitadel metadata). | Design user profile to include secondary/alternate email addresses. Clear error response when sender isn't recognized (e.g., auto-reply with instructions). |
| A4 | Claude Vision can accurately extract data from both Stripe-powered HTML receipts AND non-Stripe PDF receipts | Solution | High | High | Already works for camera-captured receipts; Stripe HTML is highly structured with consistent fields; PDF receipts are similar to photos the system already handles | Test with representative samples of both formats during development |
| A5 | AWS SES Inbound can reliably receive, store, and trigger processing of forwarded emails, integrating with the Vercel-hosted app | Solution | High | Medium | AWS SES inbound receiving is well-documented; user has existing AWS account. Cloudflare eliminated (DNS conflicts with Fastmail/Wix), Resend eliminated (bad prior experience). Unknown: specific SES → S3 → SNS/Lambda → Vercel webhook integration details. | Spike/prototype during implementation: set up SES inbound on a subdomain → S3 → SNS notification → Vercel API route |
| A6 | Forwarded emails from Fastmail preserve original HTML structure and PDF attachments intact | Solution | High | **High (VALIDATED)** | **Tested 2026-02-11**: Forwarded Vercel/Stripe receipt from Fastmail. MIME structure: `multipart/mixed` → `multipart/alternative` (text/plain + text/html) + PDF attachments. HTML fully preserved inside `<div type="cite" id="qt">` wrapper with all Stripe table layout, styled spans, amounts, dates intact. Both Invoice PDF and Receipt PDF carried through (`X-Attached` headers confirmed). Plain text fallback also contains structured receipt data. Sender identity (`From:` header) is the forwarder's address — perfect for allowlist verification. | **Validated** — no further testing needed for Stripe-powered receipts from Fastmail. Still worth testing non-Stripe receipt formats when available. |
| A7 | Users will forward receipts promptly rather than batch-processing at month-end (same procrastination risk as today) | User | Low | Medium | Even if they batch-forward, it's still vastly better than current workflow; forwarding is one tap from any email client | Observe usage patterns after launch |
| A8 | The cost of Claude Vision calls for 5-10 receipt extractions per month is negligible | Solution | Medium | High | Claude Vision API pricing is per-token; receipt images/text are small; already paying for Vision on camera-captured receipts | Calculate expected cost: ~5-10 calls × receipt token count |
| A9 | No fixed monthly cost is acceptable for the email ingestion service; pay-per-use only | Constraint | High | High | User explicitly stated: "I'm not willing to pay even $10/mo for this to work" — pay-per-use for Claude Vision and email processing is fine | Hard constraint — eliminates SendGrid, Postmark, Mailgun |

### Priority Matrix
- **Test First** (High Importance, Low/Medium Confidence): **A5** (AWS SES → Vercel integration), **A3** (sender allowlist with secondary emails)
- **Monitor** (High Importance, High Confidence): A1 (receipt frequency), A4 (Claude Vision extraction accuracy), **A6 (VALIDATED — Fastmail preserves HTML + PDFs)**, A9 (budget constraint)
- **Validate Later** (Lower priority): A2 (single address sufficiency), A7 (user forwarding behavior), A8 (Vision API cost)

## 6. Solution Hypotheses

### Hypothesis 1: "Forward & Extract" (Recommended)
- **Description**: User forwards a receipt email to a single dedicated address (e.g., `receipts@inbound.renewalinitiatives.org`). AWS SES receives the email on a subdomain, stores the raw MIME in S3, and triggers a webhook to the Vercel app. The app parses the MIME (HTML body + PDF attachments), runs Claude Vision extraction on the best available source, creates a draft expense pre-filled with vendor/amount/date/tax/category, and notifies the user. The user reviews, confirms, and assigns the expense to a report.
- **Key Differentiator**: Leverages the app's existing Claude Vision extraction pipeline — the hardest part is already built. Just adds a new input channel (email) feeding the same AI-assisted, human-confirmed workflow.
- **Target Segment**: All expense submitters. Zero friction: forward an email, get a pre-filled draft.
- **Validates Assumptions**: A1 (receipt frequency), A3 (sender allowlist), A4 (Claude Vision accuracy on email formats), A5 (AWS SES → Vercel integration), A6 (VALIDATED — Fastmail forwarding fidelity)
- **Key Risks**: AWS SES setup complexity (one-time); MIME parsing edge cases for non-Stripe receipts; sender allowlist mismatches (mitigated by secondary email support)
- **Prior Art**: Expensify (`receipts@expensify.com`), Ramp (`receipts@ramp.com`), Oracle Fusion Expenses — all use this exact pattern. AWS SES inbound → S3 → Lambda is a well-documented architecture with multiple tutorials and AWS blog posts. The subdomain MX approach (e.g., `inbound.yourdomain.com`) avoids DNS conflicts with existing email hosting.

### Alternatives Considered and Rejected
| Alternative | Why Rejected |
|-------------|-------------|
| **"Paste & Parse" (in-app upload)** | Doesn't eliminate enough friction. User still has to open email, save/export content, switch to app, upload. Only marginally better than current workflow. User rejected: "nope, hate this solution." |
| **"Fetch from Email" (JMAP/API pull)** | Couples to specific email provider (Fastmail). Different employees use different email clients. More complex than forwarding. User rejected: "seems like way more hassle." |
| **"Drag & Drop PDF"** | Better than current workflow but still requires download step. Doesn't leverage the rich HTML content in Stripe-powered emails. User rejected: "not good enough." |

### Recommendation
**Pursue Hypothesis 1 ("Forward & Extract")** because:
1. **Eliminates the most friction**: One forward from any email client → done. No downloads, no app switching, no manual data entry.
2. **Proven pattern**: Every major competitor uses this exact approach. Well-documented architecture (AWS SES → S3 → webhook).
3. **Maximizes existing investment**: Reuses the Claude Vision extraction pipeline already built for camera receipts. New input channel, same AI.
4. **Budget-friendly**: AWS SES at 5-10 emails/month costs pennies. No fixed monthly fees.
5. **Validated foundation**: Fastmail forwarding fidelity confirmed (A6). HTML, PDFs, and plain text all preserved.

Key risks to monitor: AWS SES initial setup, MIME parsing variety (non-Stripe formats), sender allowlist edge cases.
Critical assumptions to validate early: **A5** (AWS SES → Vercel integration spike) and **A3** (secondary email workflow in user profile).

## 7. Open Questions for /kickoff

### Requirements Questions
- [ ] What subdomain should receive emails? (e.g., `receipts@inbound.renewalinitiatives.org`, `receipts@expenses.renewalinitiatives.org`, or a different domain entirely?)
- [ ] Where do draft expenses from email live in the UI? New "Email Receipts" inbox/queue? Or mixed into the existing expense creation flow?
- [ ] Should the user receive a confirmation when the system processes their forwarded email? (In-app notification? Email reply? Both?)
- [ ] What should happen when a forwarded email can't be parsed (no receipt detected, extraction fails)? Notification with error? Quarantine queue?
- [ ] Should the original email (HTML + attachments) be stored as an audit artifact alongside the extracted expense? (Likely yes for compliance, but storage cost implications.)
- [ ] How should duplicate detection work? (Same receipt forwarded twice, or forwarded by two people.)

### Technical Questions
- [ ] Which AWS region for SES inbound receiving? (Only available in US East Virginia, US West Oregon, EU Ireland.)
- [ ] SES → S3 → Lambda → Vercel webhook vs. SES → S3 → SNS → Vercel webhook — which pipeline? (Lambda adds processing but also cost; SNS direct to webhook is simpler but less control.)
- [ ] How to authenticate the incoming webhook from AWS to the Vercel API route? (Shared secret? AWS IAM signature verification?)
- [ ] MIME parsing library choice for Next.js/Node? (e.g., `mailparser`, `postal-mime`, or raw parsing?)
- [ ] Extraction strategy: parse structured HTML first (cheap, fast for Stripe receipts), fall back to Claude Vision on PDF attachment for non-Stripe? Or always use Claude Vision on the best available source?
- [ ] How does the email-sourced expense integrate with the existing receipt scanning data model? New `source` field (`camera` vs `email`)? Separate table?

### Design Questions
- [ ] How does the user add secondary email addresses to their profile? Settings page? First-time prompt?
- [ ] What does the "unrecognized sender" error experience look like? Auto-reply email? Silent rejection? App notification to admins?
- [ ] Should admins have visibility into the email ingestion pipeline (received emails, processing status, errors)?

### Assumptions to Validate During Implementation
- [ ] **A5**: Spike the AWS SES → S3 → Vercel webhook pipeline end-to-end before building the full feature
- [ ] **A3**: Test sender verification with real forwarded emails from both work and personal addresses
- [ ] **A4**: Test Claude Vision extraction on non-Stripe receipt formats (conference registrations, parking, domain hosting PDFs)

## 8. Key Design Decisions (captured during Start)

These decisions emerged organically during problem exploration and are strong enough to carry forward:

| Decision | Rationale |
|----------|-----------|
| **Single dedicated email address** (e.g., `receipts@...`) | One address, save as contact, done. No per-user or per-report addresses — simplicity over flexibility. Expensify-style complexity is overkill for a small org. |
| **Manual forward, not automated inbox scanning** | User explicitly forwards receipts they want to expense. No need for mailbox monitoring, IMAP connections, or privacy concerns about scanning all email. |
| **Sender allowlist tied to Zitadel + secondary emails** | Only accept emails from addresses belonging to users with app access. Primary email from Zitadel plus user-configured secondary emails (personal addresses they might forward from). If sender isn't recognized, email is rejected with a helpful error. |
| **No role-based restrictions** | All app users can use this feature. The org is small (~8 employees); role gates would slow down design and testing for no real benefit. |
| **AI extraction on email body + attachments** | Leverage existing Claude Vision capability. Many receipts are Stripe-powered with structured HTML — high extraction confidence expected. PDF attachments provide fallback/additional data. |
| **Draft expense for human review** | Consistent with existing design principle P2 (AI-Assisted, Human-Confirmed). Forwarded email creates a pre-filled draft, user confirms before adding to a report. |

## 9. Research Log
| Date | Topic | Source | Key Findings |
|------|-------|--------|--------------|
| 2026-02-11 | Landscape scan | Brave Search (Expensify, SparkReceipt, FreshBooks, Paylocity) | Email-to-expense is a well-established pattern. Expensify pioneered it with `receipts@expensify.com`. All major players support forwarding receipts to a dedicated address with auto-parsing. This is table-stakes functionality. |
| 2026-02-11 | Receipt format analysis | User screenshots (Fastmail) | Two main formats: (1) Stripe-powered receipts (Vercel, Anthropic) with consistent HTML structure — vendor, amount, date, tax, receipt number, payment method — plus PDF attachment. (2) Non-Stripe receipts — basic emails with attached PDF receipts, less structured, more varied formatting (conferences, parking, domain hosting, etc.). Solution must handle both. |
| 2026-02-11 | Pain point validation | User interview | Current workflow: save email as file → create expense → attach → toggle to transcribe. Called "maddening" and "so dumb in an age of AI." A few receipts per month per employee. Some vendors being moved to Ramp card, but email receipts will persist. |
| 2026-02-11 | Competitive analysis | Brave Search (Expensify, Ramp, SparkReceipt, ExpenseMonkey, Easy Expense, FreshBooks, Oracle) | Every major expense tool supports email forwarding with the same pattern: single address, sender verification, AI extraction, draft expense. Ramp uses `receipts@ramp.com`; Oracle verifies against HCM Cloud (same as our Zitadel approach). |
| 2026-02-11 | Technical approaches | Brave Search (SendGrid, Cloudflare, Postmark, AWS SES, Resend) | Three viable free/pay-per-use options: Cloudflare Email Workers (free, requires CF DNS), Resend Inbound (free tier 3k/mo, webhook-based, Next.js ecosystem), AWS SES Inbound (pennies, complex). SendGrid ($20/mo), Postmark ($15/mo), Mailgun ($35/mo) eliminated by budget constraint. |
| 2026-02-11 | Budget constraint | User interview | "Not willing to pay even $10/mo." Pay-per-use acceptable (Claude Vision per scan, Twilio per email). Volume: 5-10 emails/month maximum. This eliminates most traditional email services. |
| 2026-02-11 | Resend deep dive | Brave Search, Resend docs | Resend launched inbound email in 2025 (most requested feature). Free tier: 3k emails/mo (100/day), includes both sent and received. Webhook-based, JSON payload with parsed content + attachments. Modern DX, Next.js friendly. 1-day log retention on free tier. |
| 2026-02-11 | Existing tech stack review | technology_decisions.md | D7 (Email Service) currently says "Not needed." This feature changes that decision. App is on Vercel, uses Vercel Blob for storage, Drizzle/Neon for DB, Zitadel for auth. No existing email infrastructure. |
| 2026-02-11 | User infrastructure preferences | User interview | AWS SES preferred — user has existing AWS account. Cloudflare eliminated: DNS routing conflicts with Fastmail and Wix hosting. Resend eliminated: bad prior experience. Setup complexity of AWS SES is acceptable as one-time cost vs. ongoing infrastructure conflicts. |
| 2026-02-11 | Sender allowlist refinement | User interview | Confirmed risk: users will forward from multiple email addresses (work + personal). Need to support secondary emails per user, either in Zitadel metadata or app-level user profile. |
| 2026-02-11 | **A6 VALIDATED: Fastmail forwarding fidelity** | Raw MIME inspection of forwarded Vercel/Stripe receipt | Fastmail forward preserves: (1) full Stripe HTML in `<div type="cite">` wrapper, (2) both Invoice + Receipt PDFs as attachments, (3) structured plain text fallback, (4) forwarder's From address for sender verification. MIME: `multipart/mixed` → `multipart/alternative` + PDF attachments. This is the highest-risk assumption and it's now confirmed. |
| 2026-02-11 | AWS SES inbound architecture prior art | AWS docs, Stack Overflow, AWS blog, Medium tutorials | SES inbound is well-documented: MX record on subdomain → SES receives → S3 stores raw MIME → triggers Lambda or SNS. Subdomain approach (e.g., `inbound.domain.com`) avoids DNS conflicts with main domain email (critical for Fastmail). SES receiving only available in US East Virginia, US West Oregon, EU Ireland. Multiple production tutorials confirm viability. |
| 2026-02-11 | SCAMPER alternatives explored | User interview | Three alternatives considered: (1) "Paste & Parse" in-app upload — rejected ("hate this solution"), (2) "Fetch from Email" via JMAP API — rejected ("way more hassle"), (3) "Drag & Drop PDF" — rejected ("not good enough"). User confirmed: email forwarding via AWS SES is the clear winner. |
