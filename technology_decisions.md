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

- **Decision**: Not needed
- **Date**: 2026-02-03
- **Status**: Decided (Scope)
- **Rationale**: Requirements specify in-app notifications only (R11). Email notifications explicitly out of scope.
- **Dependencies**: None

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

## External API Integrations

| Integration                 | Purpose                     | Auth Method | Status       |
| --------------------------- | --------------------------- | ----------- | ------------ |
| QuickBooks Online           | Bills, categories, projects | OAuth 2.0   | To configure |
| Claude Vision               | Receipt OCR                 | API key     | To configure |
| Google Maps Distance Matrix | Mileage calculation         | API key     | To configure |
