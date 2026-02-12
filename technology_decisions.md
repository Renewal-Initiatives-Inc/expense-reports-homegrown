# Technology Decisions: Expense Reports Homegrown

> **Purpose**: Document technology choices for the expense management system, capturing rationale and tradeoffs for each decision.

## Decision-Making Philosophy

Technology choices for this project prioritize:

1. **Platform consistency** - Match App Portal patterns for developer familiarity
2. **Learning value** - Enable hands-on experience with QBO API, Claude Vision, Google Maps
3. **Simplicity** - Right-size for ~8 employees with monthly usage

---

## Confirmed Constraints

| Constraint           | Value                               | Source                       |
| -------------------- | ----------------------------------- | ---------------------------- |
| User scale           | ~8 employees, ~2 active users       | Requirements A4              |
| Usage pattern        | Monthly submissions                 | Requirements A4              |
| Compliance           | None specified beyond accessibility | Requirements R16             |
| Budget               | Minimal (free tiers preferred)      | Implied by nonprofit context |
| Team size            | Solo developer with AI assistance   | Ideation context             |
| Platform integration | Must match App Portal patterns      | Design P5                    |

---

## Decision Log

### D1: Backend Language & Framework

- **Decision**: Next.js 16+ with App Router + TypeScript 5
- **Date**: 2026-02-03
- **Status**: Pre-decided (Platform Consistency)
- **Options Considered**:
  - Next.js App Router - Full-stack React framework, server components, API routes
  - Other frameworks not considered (platform consistency requirement)
- **Rationale**: Must match App Portal for developer familiarity and shared patterns
- **Key Tradeoffs Accepted**: Locked into Vercel ecosystem (acceptable given deployment target)
- **Dependencies**: Drives choice of deployment platform, testing tools

---

### D2: Database

- **Decision**: Vercel Postgres (Neon) + Drizzle ORM
- **Date**: 2026-02-03
- **Status**: Pre-decided (Platform Consistency)
- **Options Considered**:
  - Vercel Postgres + Drizzle - Serverless Postgres, type-safe ORM
  - Other databases not considered (platform consistency requirement)
- **Rationale**: Must match App Portal stack; Drizzle provides excellent TypeScript integration
- **Key Tradeoffs Accepted**: Vercel Postgres has connection pooling limits (acceptable for ~2 users)
- **Dependencies**: None

---

### D3: Frontend Framework

- **Decision**: React (via Next.js) + Tailwind CSS v4 + shadcn/ui
- **Date**: 2026-02-03
- **Status**: Pre-decided (Platform Consistency)
- **Options Considered**:
  - React + Tailwind + shadcn/ui - Component library with copy-paste components
  - Other UI frameworks not considered (platform consistency requirement)
- **Rationale**: Matches App Portal design system; shadcn/ui provides accessible, customizable components
- **Key Tradeoffs Accepted**: Larger initial setup than pre-built component libraries
- **Dependencies**: Drives UI/UX foundations decision

---

### D4: Local Development Environment

- **Decision**: macOS with native Node.js (no Docker)
- **Date**: 2026-02-03
- **Status**: Decided
- **Options Considered**:
  - Native Node.js on macOS - Simplest setup, direct debugging, fast iteration
  - Docker - Adds consistency but complexity overhead for solo developer
- **Rationale**: Solo development on macOS; Docker adds unnecessary complexity for this use case
- **Key Tradeoffs Accepted**: Slight platform difference from Linux production (minimal risk for Node.js apps)
- **Environment Notes**:
  - Configure `.gitattributes` for LF line endings
  - Use consistent import casing (case-sensitive behavior)
  - Production runs on Linux (Vercel) - CI will catch any platform-specific issues

---

### D5: Hosting Platform & Deployment Environments

- **Decision**: Vercel with Dev + Prod environments
- **Date**: 2026-02-03
- **Status**: Decided
- **Options Considered**:
  - Dev + Prod - Preview deployments for testing, main branch = production
  - Dev + Staging + Prod - Extra staging environment (unnecessary overhead for this scale)
- **Rationale**: Matches App Portal approach; preview deployments provide isolated testing per PR, Vercel instant rollback covers mistakes. Staging adds complexity without proportional benefit for ~8 users.
- **Key Tradeoffs Accepted**: No dedicated staging environment; must trust preview deployments as final check before merging
- **Environment Notes**:
  - Local: macOS with native Node.js
  - Preview: Vercel preview deployments (per PR/push)
  - Production: [TBD - domain to be configured]
  - No OS mismatch concerns (Mac → Vercel Linux handled by build process)

---

### D6: File/Document Storage

- **Decision**: Vercel Blob
- **Date**: 2026-02-03
- **Status**: Pre-decided (Platform Consistency)
- **Options Considered**:
  - Vercel Blob - Serverless blob storage with signed URLs
- **Rationale**: Platform consistency; native integration with Vercel, supports receipt image storage
- **Key Tradeoffs Accepted**: Vendor lock-in to Vercel (acceptable given overall platform choice)
- **Dependencies**: None

---

### D7: Email Service

- **Decision**: ~~Not needed~~ → AWS SES (inbound + outbound)
- **Date**: 2026-02-03 (original), **2026-02-11 (updated for Email Receipts feature)**
- **Status**: Updated
- **Options Considered**:
  - AWS SES Inbound - MX record on subdomain, stores in S3, triggers SNS (~$0.01/mo)
  - Cloudflare Email Workers - Free, but requires CF DNS (conflicts with Fastmail/Wix)
  - Resend Inbound - Free tier, webhook-based (user had bad prior experience)
  - SendGrid/Postmark/Mailgun - $15-35/mo fixed cost (violates budget constraint)
- **Rationale**: AWS SES is essentially free at 5-10 emails/month, user has existing AWS account, subdomain MX avoids DNS conflicts with Fastmail. Outbound SES also needed for auto-reply to unrecognized senders. One-time setup complexity is acceptable vs. ongoing cost or infrastructure conflicts.
- **Key Tradeoffs Accepted**: Complex initial setup (SES + S3 + SNS + IAM); SES inbound only available in us-east-1, us-west-2, eu-west-1
- **Dependencies**: Requires MX record on `expenses.renewalinitiatives.org` subdomain; drives D11 (pipeline architecture)

---

### D8: Authentication Strategy

- **Decision**: NextAuth.js v5 + Zitadel OIDC
- **Date**: 2026-02-03
- **Status**: Pre-decided (Platform Consistency)
- **Options Considered**:
  - NextAuth.js v5 + Zitadel - SSO with existing Renewal Initiatives auth infrastructure
- **Rationale**: Must integrate with existing Zitadel instance for SSO with App Portal
- **Key Tradeoffs Accepted**: Dependent on external Zitadel instance availability
- **Dependencies**: Requires Zitadel app configuration with `app:expense-reports-homegrown` role

---

### D9: Testing Framework

- **Decision**: Vitest (unit/integration) + Playwright (E2E)
- **Date**: 2026-02-03
- **Status**: Pre-decided (Platform Consistency)
- **Options Considered**:
  - Vitest - Fast, Vite-based testing for unit and integration tests
  - Playwright - Cross-browser E2E testing
- **Rationale**: Platform consistency; Vitest integrates well with Vite/Next.js ecosystem
- **Key Tradeoffs Accepted**: None significant
- **Dependencies**: Need to verify tests run on local dev OS and CI environment

---

### D10: UI/UX Foundations

- **Decision**: shadcn/ui + Tailwind CSS v4 with Renewal Initiatives branding
- **Date**: 2026-02-03
- **Status**: Decided
- **Options Considered**:
  - shadcn/ui + Tailwind - Copy-paste components on Radix primitives, matches App Portal
  - Other component libraries not considered (platform consistency requirement)
- **Rationale**: Matches App Portal design system; shadcn/ui provides accessible components built on Radix; owned components (not a dependency) allow full customization
- **Key Tradeoffs Accepted**: None significant; aligns with existing platform patterns
- **UI Summary**:
  - Accessibility baseline: WCAG 2.1 AA / Section 508
  - Reference site: renewalinitiatives.org
  - Primary color: #2c5530 (forest green)
  - Color scheme: Light mode only
  - Fonts: System font stack (-apple-system, etc.)
  - Component library: shadcn/ui

---

### D11: AWS Pipeline Architecture (Email Receipts)

- **Decision**: SES → S3 → SNS → Vercel webhook (no Lambda)
- **Date**: 2026-02-11
- **Status**: Decided
- **Options Considered**:
  - SES → S3 → SNS → Vercel webhook - Simplest; fewest services; SNS handles retries
  - SES → S3 → Lambda → Vercel webhook - Lambda pre-filters before hitting app; more control
  - SES → S3 → EventBridge → Vercel webhook - Better retry/DLQ support; overkill at this volume
- **Rationale**: At 5-10 emails/month, Lambda pre-filtering adds complexity without benefit. The Vercel webhook handler can do all validation (sender check, MIME parsing, extraction). SNS provides automatic retry on transient failures. Fewer services = less to maintain.
- **Key Tradeoffs Accepted**: Less control over retries than Lambda (acceptable at this volume); SNS may deliver duplicate messages (handle with idempotency via email_message_id)
- **Dependencies**: D7 (AWS SES); webhook route at `/api/email/inbound`

---

### D12: MIME Parsing Library (Email Receipts)

- **Decision**: `postal-mime`
- **Date**: 2026-02-11
- **Status**: Decided
- **Options Considered**:
  - `postal-mime` - Modern, lightweight (~25KB), designed for serverless/edge environments, Promise-based API
  - `mailparser` - Established (~180KB), part of Nodemailer ecosystem, handles every MIME edge case
  - Manual parsing - No dependency, but MIME spec is a minefield of encoding/boundary/charset edge cases
- **Rationale**: `postal-mime` is purpose-built for serverless environments like Vercel. Lightweight, Promise-native, handles attachments cleanly. At 5-10 emails/month (mostly Stripe-powered or standard PDFs), obscure MIME edge cases are unlikely. `mailparser` is battle-tested but brings unnecessary weight.
- **Key Tradeoffs Accepted**: Smaller community than `mailparser`; less battle-tested on exotic MIME formats (acceptable given receipt-focused use case)
- **Dependencies**: None

---

### D13: Webhook Authentication (Email Receipts)

- **Decision**: SNS Message Signature Verification
- **Date**: 2026-02-11
- **Status**: Decided
- **Options Considered**:
  - SNS signature verification - Cryptographic verification of SNS message signatures using AWS-published certs
  - Shared secret header - Simple token check (can't inject custom headers into SNS without Lambda)
  - API Gateway + IAM - AWS API Gateway in front of webhook (adds another service)
- **Rationale**: AWS-recommended approach for SNS → HTTPS endpoints. No shared secrets to manage or rotate. Each SNS message includes a signature and signing cert URL — handler verifies cryptographically. Available as npm package (`sns-validator`). Shared secret doesn't work cleanly without Lambda; API Gateway defeats the simplicity of the direct pipeline.
- **Key Tradeoffs Accepted**: Requires fetching/caching signing cert on each request (minimal overhead); must validate cert URL is `*.amazonaws.com` to prevent spoofing
- **Dependencies**: D11 (SNS pipeline)

---

### D14: HTML Receipt Storage Strategy (Email Receipts)

- **Decision**: Store raw HTML in Vercel Blob; extract data via Claude Vision text input (no rendering)
- **Date**: 2026-02-11
- **Status**: Decided
- **Options Considered**:
  - Store HTML + extract as text via Claude Vision - Pass HTML to Claude as text input; store raw HTML in Blob as audit artifact
  - Convert HTML to PDF server-side (Puppeteer) - Consistent PDF format; heavy dependency (~300MB)
  - Screenshot HTML to image (Puppeteer) - Consistent with camera receipts; same heavy dependency
  - Store raw HTML + render in iframe - Full fidelity display; XSS/security concerns
- **Rationale**: Most Stripe receipts include PDF attachments (validated via Fastmail test) — HTML-only is the fallback, not the common case. Claude reads structured HTML text more accurately than OCR on a rendered screenshot. Avoids pulling Puppeteer into Vercel serverless (size limits, cold start). Reuses the existing Claude Vision extraction pipeline — HTML is just another input format. Raw HTML stored in Blob as downloadable audit artifact if ever needed.
- **Key Tradeoffs Accepted**: Users can't "view" HTML receipts as rendered images in the UI — they see extracted fields + can download the raw HTML. Acceptable since this case is rare and audit rendering isn't needed for ~5 years.
- **Dependencies**: D6 (Vercel Blob for storage); reuses existing Claude Vision pipeline

---

## External API Integrations

| Integration                 | Purpose                              | Auth Method              | Status       |
| --------------------------- | ------------------------------------ | ------------------------ | ------------ |
| QuickBooks Online           | Bills, categories, projects          | OAuth 2.0                | To configure |
| Claude Vision               | Receipt OCR                          | API key                  | To configure |
| Google Maps Distance Matrix | Mileage calculation                  | API key                  | To configure |
| AWS SES (Inbound)           | Receive forwarded receipt emails     | MX record + SNS sig verify | To configure |
| AWS SES (Outbound)          | Auto-reply to unrecognized senders   | IAM credentials          | To configure |
| AWS S3                      | Raw email MIME storage               | IAM credentials          | To configure |
| AWS SNS                     | Email processing event notifications | SNS signature            | To configure |
