# Requirements: Expense Reports Homegrown

> **A production-quality expense management system modeled after Ramp, built as a learning project to explore QBO API integration and AI-powered receipt scanning.**

## 1. Introduction

### 1.1 Organization Context

Renewal Initiatives is a small nonprofit (~8 employees) using QuickBooks Online for accounting and Ramp for corporate cards. While Ramp provides expense management, this project intentionally builds a custom solution to:

1. **Learn QBO API integration** - OAuth flows, creating bills, reading chart of accounts
2. **Learn AI/Vision for document processing** - Receipt OCR with Claude Vision
3. **Explore "personal software"** - What's possible when domain experts pair with AI-assisted development?

### 1.2 What We're Building

A web application where employees submit expense reports (out-of-pocket purchases and mileage) that flow through approval to QuickBooks Online as bills for reimbursement.

**Key differentiator from Ramp**: Simplified, focused on the core workflow, built for learning.

### 1.3 Success Criteria

- End-to-end workflow: Submit → Approve → Bill in QBO
- Production-quality: Comprehensive tests, error handling, edge cases covered
- Learning achieved: Hands-on experience with QBO API, Claude Vision, Google Maps API

---

## 2. Glossary

| Term               | Definition                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| **Expense Report** | A named collection of expenses submitted together for approval                    |
| **Expense**        | A single line item: either an out-of-pocket purchase or mileage claim             |
| **Out-of-pocket**  | An expense paid with personal funds (not corporate card), requiring reimbursement |
| **Mileage**        | An expense calculated from distance traveled × IRS rate                           |
| **Receipt**        | Image proof of an out-of-pocket expense                                           |
| **QBO**            | QuickBooks Online - the accounting system where approved expenses sync as bills   |
| **Bill**           | QBO object representing money owed to a vendor (in this case, the employee)       |
| **Category**       | Expense classification from QBO chart of accounts (e.g., Travel, Meals)           |
| **Project**        | QBO project/job for tracking expenses against grants or clients                   |
| **Billable**       | Flag indicating an expense can be billed onward to a client                       |
| **IRS Rate**       | Federal mileage reimbursement rate (currently $0.70/mile for 2025)                |

---

## 3. Requirements

### R1: User Authentication

**Traces to**: Ideation A10 (unified auth addressable via Zitadel)

**User Story**: As a user, I want to sign in with my existing Renewal Initiatives credentials, so that I don't need another username/password.

**Acceptance Criteria**:

1. THE System SHALL authenticate users via Zitadel OIDC using the existing Renewal Initiatives project
2. THE System SHALL require the `app:expense-reports-homegrown` role to access the application
3. THE System SHALL identify users with the `admin` role as approvers
4. THE System SHALL support single sign-on with the App Portal and other platform apps
5. THE System SHALL redirect unauthenticated users to the login page

---

### R2: Expense Report Management

**Traces to**: Ideation A1 (Ramp doesn't meet our needs - now building custom)

**User Story**: As a submitter, I want to create and manage expense reports, so that I can organize my expenses before submitting for approval.

**Acceptance Criteria**:

1. THE System SHALL allow users to create new expense reports
2. THE System SHALL assign a default name of "Report YYYY-MM-DD" if the user does not provide one
3. THE System SHALL allow users to optionally name their expense report (e.g., "Cincinnati Trip")
4. THE System SHALL display all expense reports belonging to the current user
5. THE System SHALL show each report's status: Open, Submitted, Approved, or Rejected
6. THE System SHALL allow users to edit reports in Open status only
7. THE System SHALL allow users to delete reports in Open status only
8. THE System SHALL prevent modification of reports in Submitted, Approved, or Rejected status (except resubmission flow)

---

### R3: Out-of-Pocket Expense Entry

**Traces to**: Ideation A1, A5 (AI receipt scanning)

**User Story**: As a submitter, I want to add out-of-pocket expenses with receipt images, so that I can get reimbursed for business purchases made with personal funds.

**Acceptance Criteria**:

1. THE System SHALL allow users to add out-of-pocket expenses to an Open report
2. THE System SHALL capture receipt images via web camera with a "scanning station" UX:
   - Show camera preview
   - Auto-detect when image is stable/focused
   - Capture on user confirmation
   - Prompt "Add another?" or "Done"
3. THE System SHALL accept receipt image uploads as an alternative to camera capture
4. THE System SHALL send receipt images to Claude Vision API for data extraction
5. THE System SHALL extract from receipts: merchant name, total amount, date
6. THE System SHALL suggest an expense category based on receipt content and available QBO categories
7. THE System SHALL display confidence indicators for AI-extracted fields
8. THE System SHALL show "low confidence" warnings for uncertain extractions
9. THE System SHALL allow users to edit all extracted fields before saving
10. THE System SHALL require: amount, date, category
11. THE System SHALL support optional fields: merchant name, memo, project, billable flag
12. THE System SHALL only show the "Billable" checkbox when a project is selected
13. THE System SHALL store receipt images in Vercel Blob storage
14. THE System SHALL display receipt thumbnails on expense line items

---

### R4: Mileage Expense Entry

**Traces to**: Ideation A2 (mileage calculation without manual math)

**User Story**: As a submitter, I want to enter trip endpoints and have mileage calculated automatically, so that I don't have to manually calculate distances and reimbursement amounts.

**Acceptance Criteria**:

1. THE System SHALL allow users to add mileage expenses to an Open report
2. THE System SHALL accept origin and destination addresses
3. THE System SHALL support multiple stops (waypoints) between origin and destination
4. THE System SHALL call Google Maps Distance Matrix API to calculate driving distance
5. THE System SHALL apply the configured IRS mileage rate to calculate the reimbursement amount
6. THE System SHALL display the calculated distance and amount before saving
7. THE System SHALL allow users to manually override the calculated distance if actual miles differ
8. THE System SHALL enforce a maximum manual entry of 999 miles
9. THE System SHALL require: origin, destination, date, calculated/entered miles
10. THE System SHALL support optional fields: memo, project, billable flag

---

### R5: Expense Categories from QBO

**Traces to**: Ideation A4 (QBO integration)

**User Story**: As a submitter, I want to select from our organization's actual expense categories, so that my expenses are coded correctly for accounting.

**Acceptance Criteria**:

1. THE System SHALL fetch expense categories from QBO chart of accounts via API
2. THE System SHALL cache categories locally with a reasonable refresh interval
3. THE System SHALL NOT maintain a separate category list in the application database
4. THE System SHALL display categories in a searchable dropdown
5. THE System SHALL handle QBO API unavailability gracefully with cached data

---

### R6: Projects from QBO

**Traces to**: Ideation A4 (QBO integration)

**User Story**: As a submitter, I want to optionally assign expenses to projects, so that grant-related expenses can be tracked and billed appropriately.

**Acceptance Criteria**:

1. THE System SHALL fetch active projects from QBO via API
2. THE System SHALL cache projects locally with a reasonable refresh interval
3. THE System SHALL display projects in a searchable dropdown (optional field)
4. THE System SHALL show "Billable" checkbox only when a project is selected
5. THE System SHALL handle organizations with no QBO projects gracefully (hide project field)

---

### R7: Report Submission

**Traces to**: Ideation A1

**User Story**: As a submitter, I want to submit my expense report for approval, so that I can get reimbursed.

**Acceptance Criteria**:

1. THE System SHALL allow submission of reports containing at least one expense
2. THE System SHALL validate all expenses have required fields before submission
3. THE System SHALL change report status from Open to Submitted upon submission
4. THE System SHALL record submission timestamp
5. THE System SHALL prevent further edits after submission
6. THE System SHALL create an in-app notification for all admin users

---

### R8: Report Approval Workflow

**Traces to**: Ideation A1

**User Story**: As an admin, I want to review and approve/reject expense reports, so that valid expenses are reimbursed and invalid ones are returned for correction.

**Acceptance Criteria**:

1. THE System SHALL display all Submitted reports to users with admin role
2. THE System SHALL allow any admin to approve or reject any submitted report (first-come-first-serve)
3. THE System SHALL allow admins to approve their own submitted reports
4. THE System SHALL require a comment when rejecting a report
5. THE System SHALL allow optional comments when approving
6. THE System SHALL change status to Approved or Rejected upon action
7. THE System SHALL record approver identity and timestamp
8. THE System SHALL display supervisor comments on the report (read-only to submitter)
9. THE System SHALL create an in-app notification for the submitter upon approval/rejection

---

### R9: Report Rejection and Resubmission

**Traces to**: Ideation A1

**User Story**: As a submitter, I want to edit and resubmit rejected reports, so that I can fix issues and get reimbursed.

**Acceptance Criteria**:

1. THE System SHALL change Rejected reports back to Open status automatically
2. THE System SHALL preserve supervisor rejection comments (read-only)
3. THE System SHALL allow editing of all expense fields on rejected reports
4. THE System SHALL allow adding/removing expenses from rejected reports
5. THE System SHALL allow resubmission following the same submission flow (R7)
6. THE System SHALL maintain history of rejection/resubmission cycles

---

### R10: QuickBooks Online Integration

**Traces to**: Ideation A4 (QBO integration - primary learning goal)

**User Story**: As an organization, I want approved expenses to automatically appear in QuickBooks as bills, so that the finance team can process reimbursements without manual data entry.

**Acceptance Criteria**:

1. THE System SHALL authenticate with QBO via OAuth 2.0
2. THE System SHALL store and refresh QBO access tokens securely
3. THE System SHALL sync approved expense reports to QBO as Bills
4. THE System SHALL set the Bill vendor as the employee's name
5. THE System SHALL create line items for each expense with:
   - Amount
   - Category (account from chart of accounts)
   - Description (merchant + memo)
   - Project (if specified)
   - Billable flag (if applicable)
6. THE System SHALL attach receipt images to the QBO Bill
7. THE System SHALL record the QBO Bill ID on the expense report
8. THE System SHALL handle QBO sync failures gracefully with retry capability
9. THE System SHALL NOT sync reports that have already been synced (idempotency)
10. THE System SHALL use a distinguishing prefix (e.g., "EXP-") for Bill document numbers to avoid collision with bills created directly in QBO

---

### R11: In-App Notifications

**Traces to**: Ideation (in-app notifications only, no email)

**User Story**: As a user, I want to see notifications about my expense reports, so that I know when action is needed or status has changed.

**Acceptance Criteria**:

1. THE System SHALL display a notification indicator in the app header
2. THE System SHALL show unread notification count
3. THE System SHALL create notifications for:
   - Submitter: Report approved
   - Submitter: Report rejected (with reason preview)
   - Admin: New report submitted for approval
4. THE System SHALL mark notifications as read when viewed
5. THE System SHALL link notifications to the relevant report

---

### R12: Admin Settings

**Traces to**: Ideation (admin-configurable IRS rate)

**User Story**: As an admin, I want to configure system settings, so that the application reflects current policies.

**Acceptance Criteria**:

1. THE System SHALL provide an admin settings page accessible only to admin users
2. THE System SHALL allow admins to configure the IRS mileage reimbursement rate
3. THE System SHALL display the current rate and effective date
4. THE System SHALL validate rate is a positive decimal number
5. THE System SHALL apply rate changes to new mileage expenses only (not retroactive)

---

### R13: Receipt Image Processing

**Traces to**: Ideation A5 (AI receipt scanning - primary learning goal)

**User Story**: As a submitter, I want the system to automatically read my receipts, so that I don't have to manually type all the details.

**Acceptance Criteria**:

1. THE System SHALL send receipt images to Claude Vision API
2. THE System SHALL extract: merchant name, total amount, transaction date
3. THE System SHALL suggest expense category from available QBO categories
4. THE System SHALL return confidence scores for each extracted field
5. THE System SHALL flag low-confidence extractions with visual indicator
6. THE System SHALL handle unreadable/unclear receipts gracefully
7. THE System SHALL process receipts asynchronously to avoid blocking UI
8. THE System SHALL timeout receipt processing after reasonable duration (30 seconds)

---

### R14: Dashboard and Reporting

**Traces to**: Ideation (user needs visibility into expense status)

**User Story**: As a user, I want to see a summary of my expense activity, so that I can track what's pending and what's been reimbursed.

**Acceptance Criteria**:

1. THE System SHALL display a dashboard as the landing page after login
2. THE System SHALL show submitters:
   - Summary counts by status (Open, Submitted, Approved, Rejected)
   - Recent expense reports with status
   - Quick action to create new report
3. THE System SHALL show admins:
   - Count of reports pending approval
   - List of reports awaiting their review
   - Link to admin settings
4. THE System SHALL support filtering reports by status and date range

---

### R15: Data Validation and Error Handling

**Traces to**: Production-quality requirement

**User Story**: As a user, I want clear feedback when something goes wrong, so that I can fix issues or know to try again later.

**Acceptance Criteria**:

1. THE System SHALL validate all form inputs before submission
2. THE System SHALL display inline validation errors on form fields
3. THE System SHALL handle API failures (QBO, Google Maps, Claude) with user-friendly messages
4. THE System SHALL provide retry options for transient failures
5. THE System SHALL log errors for debugging without exposing sensitive data to users
6. THE System SHALL maintain data integrity during partial failures (transactions)

---

### R16: Accessibility and UX

**Traces to**: Production-quality requirement

**User Story**: As a user, I want an accessible, responsive interface, so that I can use the application effectively.

**Acceptance Criteria**:

1. THE System SHALL follow WCAG 2.1 AA accessibility guidelines
2. THE System SHALL support keyboard navigation throughout
3. THE System SHALL provide appropriate ARIA labels for interactive elements
4. THE System SHALL display loading states during async operations
5. THE System SHALL be responsive for desktop and tablet viewports
6. THE System SHALL use the Renewal Initiatives design system (forest green brand color, shadcn/ui components)

---

## 4. Out of Scope (v1)

Per ideation decisions, the following are explicitly excluded:

- Mobile native app (web-only for v1)
- SMS or email receipt submission
- GPS-based mileage tracking
- Payment status tracking from QBO (reimbursement happens in QBO)
- Multi-level approval workflows
- Report assignment to specific approvers
- Email notifications
- Commute distance deduction
- Duplicate previous expense feature

---

## 5. Technical Constraints

| Constraint    | Value                                         |
| ------------- | --------------------------------------------- |
| Framework     | Next.js 16+ with App Router                   |
| Styling       | Tailwind CSS v4 + shadcn/ui                   |
| Database      | Vercel Postgres (Neon) + Drizzle ORM          |
| Auth          | NextAuth.js v5 + Zitadel OIDC                 |
| File Storage  | Vercel Blob                                   |
| Deployment    | Vercel                                        |
| Testing       | Vitest (unit) + Playwright (E2E)              |
| External APIs | QuickBooks Online, Claude Vision, Google Maps |

---

## 6. Assumptions

| ID  | Assumption                                                 | Status    |
| --- | ---------------------------------------------------------- | --------- |
| A1  | User has admin access to QBO production account            | Confirmed |
| A2  | User has Google Cloud account with billing                 | Confirmed |
| A3  | User has Anthropic API access for Claude Vision            | Confirmed |
| A4  | ~2 active users, ~monthly usage                            | Confirmed |
| A5  | Zitadel project and roles can be configured                | Confirmed |
| A6  | QBO has existing chart of accounts with expense categories | To verify |
| A7  | QBO projects feature is enabled (if using projects)        | To verify |
