# Implementation Plan: Expense Reports Homegrown

> **Overview**: Build a production-quality expense management system in incremental phases, each producing something testable.

## Prerequisites

- [x] requirements.md (from /kickoff)
- [x] design.md (from /kickoff)
- [x] technology_decisions.md (from /tech-stack)

---

## Phase 0: Technology Stack Decisions

**Status**: Complete (see technology_decisions.md)

---

## Phase 1: Project Scaffolding & Authentication

**Goal**: Set up the Next.js project with Zitadel SSO authentication working end-to-end.

**Tasks**:

1. Initialize Next.js 16+ project with App Router and TypeScript
2. Configure Tailwind CSS v4 and install shadcn/ui
3. Set up ESLint and Prettier with project conventions
4. Configure `.gitattributes` for LF line endings
5. Set up NextAuth.js v5 with Zitadel OIDC provider
6. Create Zitadel application for `app:expense-reports-homegrown`
7. Configure role-based access (regular user vs admin)
8. Create basic layout with header, navigation, and auth state
9. Implement protected routes middleware
10. Create login/logout flow with redirect handling

**Deliverable**: User can sign in via Zitadel SSO and see their role (user/admin) on a basic dashboard.

**External Setup Required**:

- Zitadel application registration
- Environment variables for OIDC

---

## Phase 2: Database & Basic Report CRUD

**Goal**: Establish database schema and basic expense report management.

**Tasks**:

1. Set up Vercel Postgres connection
2. Configure Drizzle ORM with schema files
3. Create database schema for expense_reports table
4. Create database schema for expenses table
5. Create database schema for notifications table
6. Create database schema for settings table
7. Create database schema for qbo_cache and qbo_tokens tables
8. Set up Drizzle migrations
9. Build API routes for report CRUD (create, read, update, delete)
10. Create "My Reports" page listing user's expense reports
11. Create "New Report" form with name field
12. Implement report status display (Open, Submitted, Approved, Rejected)
13. Add edit/delete actions for Open reports only

**Deliverable**: User can create, view, edit, and delete expense reports (without expenses yet).

---

## Phase 3: Out-of-Pocket Expense Entry

**Goal**: Allow users to add out-of-pocket expenses with receipt image upload.

**Tasks**:

1. Set up Vercel Blob for file storage
2. Create expense entry form for out-of-pocket type
3. Implement receipt image upload (file picker)
4. Store receipt images in Vercel Blob
5. Generate and store receipt thumbnails
6. Build expense line item display with receipt thumbnail
7. Create category dropdown (hardcoded initially, QBO in Phase 7)
8. Implement required field validation (amount, date, category)
9. Implement optional fields (merchant, memo, project, billable)
10. Show/hide billable checkbox based on project selection
11. Build expense edit and delete functionality
12. Add expense total calculation on report

**Deliverable**: User can add out-of-pocket expenses with receipts to a report.

---

## Phase 4: Receipt Processing with Claude Vision

**Goal**: Automatically extract receipt data using Claude Vision API.

**Tasks**:

1. Set up Anthropic API client
2. Create receipt processing API route
3. Build Claude Vision prompt for receipt extraction (merchant, amount, date)
4. Implement category suggestion based on receipt content
5. Return confidence scores for each extracted field
6. Display extracted data with confidence indicators in UI
7. Show low-confidence warnings for uncertain extractions
8. Allow user to edit/confirm all extracted fields
9. Handle unreadable receipts gracefully
10. Implement 30-second timeout for processing
11. Add loading state during receipt processing

**Deliverable**: When user uploads receipt, system auto-fills expense fields with confidence indicators.

---

## Phase 5: Camera Capture & Scanning Station UX

**Goal**: Implement camera-based receipt capture with "scanning station" experience.

**Tasks**:

1. Implement WebRTC camera access
2. Create camera preview component
3. Build capture button with visual feedback
4. Integrate with existing receipt processing flow
5. Create "Add another?" or automatic progression / "Done" flow after capture
6. Handle camera permission denial gracefully
7. Provide fallback to file upload
8. Test across browsers (Chrome, Firefox, Safari)

**Deliverable**: User can capture receipts via camera with smooth scanning workflow.

---

## Phase 6: Mileage Expense Entry

**Goal**: Allow users to add mileage expenses with automatic distance calculation.

**Tasks**:

1. Set up Google Maps Distance Matrix API
2. Create mileage expense entry form
3. Implement address autocomplete for origin/destination
4. Add support for multiple stops (waypoints)
5. Call Distance Matrix API to calculate driving distance
6. Store and display IRS mileage rate from settings
7. Calculate reimbursement amount (miles × rate)
8. Display calculated distance and amount before saving
9. Allow manual override of calculated distance (max 999 miles)
10. Implement required field validation (origin, destination, date, miles)

**Deliverable**: User can add mileage expenses with auto-calculated distances.

---

## Phase 7: QuickBooks Online Integration - Setup

**Goal**: Establish QBO OAuth connection and sync reference data.

**Tasks**:

1. Register QBO developer application
2. Implement QBO OAuth 2.0 flow
3. Create admin page for QBO connection
4. Securely store access/refresh tokens (encrypted)
5. Implement automatic token refresh before expiry
6. Fetch expense categories from QBO chart of accounts
7. Implement category caching with 1-hour refresh
8. Fetch active projects from QBO
9. Implement project caching
10. Replace hardcoded categories with QBO categories
11. Handle QBO unavailability gracefully (use cached data)

**Deliverable**: App connected to QBO; categories and projects sync automatically.

---

## Phase 7b: QuickBooks Online Production Approval

**Goal**: Complete Intuit's app assessment process and configure production environment.

**Prerequisites**: Phase 7 complete with working sandbox integration.

**Reference**: [Intuit Developer Documentation](https://developer.intuit.com/app/developer/qbo/docs/develop)

**Tasks**:

1. Complete Intuit Developer Portal app assessment questionnaire
2. Create Privacy Policy page (`/privacy`) and host at production URL
3. Create Terms of Service page (`/terms`) and host at production URL
4. Prepare app branding assets (logo 150x150px minimum, app description)
5. Submit production URLs to Intuit (app URL, redirect URI, privacy policy, terms)
6. Document security practices for Intuit review (token encryption, data handling)
7. Respond to any Intuit reviewer questions/requests
8. Obtain production OAuth credentials (Client ID, Client Secret)
9. Configure production environment variables on Vercel
10. Update production redirect URI in Intuit portal
11. Test OAuth flow with production credentials
12. Verify category and project sync works in production
13. Set up error monitoring/alerting for QBO API failures

**External Setup Required**:

- Intuit Developer Portal production app approval
- Privacy Policy content (legal review recommended)
- Terms of Service content (legal review recommended)
- Production hosting with HTTPS (Vercel)

**Deliverable**: App approved for production QBO access; OAuth flow works with production credentials.

**Notes**:

- Intuit review can take several days to weeks depending on app complexity
- Privacy policy must explain what QBO data is accessed and how it's used
- May need to demonstrate the app to Intuit reviewers
- Keep sandbox credentials for development/testing after production approval

---

## Phase 8: Report Submission & Approval Workflow

**Goal**: Implement the full submission and approval workflow.

**Tasks**:

1. Create "Submit Report" action with validation
2. Enforce minimum one expense for submission
3. Change status from Open to Submitted
4. Record submission timestamp
5. Lock report editing after submission
6. Create admin approval queue page
7. Implement approve action (any admin, any report)
8. Implement reject action with required comment
9. Display rejection comments to submitter (read-only)
10. Implement rejected → open automatic status change
11. Allow editing and resubmission of rejected reports
12. Maintain rejection/resubmission history

**Deliverable**: Full approval workflow: Submit → Approve/Reject → Resubmit if rejected.

---

## Phase 9: In-App Notifications

**Goal**: Keep users informed about report status changes.

**Tasks**:

1. Create notification indicator in app header
2. Display unread notification count
3. Create notifications dropdown/panel
4. Generate notification on report submission (for admins)
5. Generate notification on approval (for submitter)
6. Generate notification on rejection (for submitter with reason preview)
7. Implement mark-as-read functionality
8. Link notifications to relevant reports

**Deliverable**: Users see notifications for all report status changes.

---

## Phase 10: QBO Bill Sync

**Goal**: Sync approved expense reports to QuickBooks as bills.

**Tasks**:

1. Design Bill structure (vendor = employee, line items = expenses)
2. Implement Bill creation API call
3. Set vendor as employee name
4. Create line items with amount, category, description, project, billable flag
5. Attach receipt images to QBO Bill
6. Use "EXP-" prefix for Bill document numbers
7. Record QBO Bill ID on expense report
8. Implement idempotency (don't re-sync if bill_id exists)
9. Handle sync failures with retry capability
10. Add "Pending QBO Sync" indicator for failed syncs
11. Create manual retry option in admin UI

**Deliverable**: Approved reports automatically create bills in QBO.

---

## Phase 11: Admin Settings & Dashboard

**Goal**: Build admin configuration and overview dashboard.

**Tasks**:

1. Create admin settings page (admin role required)
2. Implement IRS mileage rate configuration
3. Display current rate and effective date
4. Validate rate is positive decimal
5. Apply new rate to future expenses only (not retroactive)
6. Build dashboard landing page
7. Show submitter view: counts by status, recent reports, quick actions
8. Show admin view: pending approval count, approval queue link, settings link
9. Implement report filtering by status and date range

**Deliverable**: Admins can configure settings; all users have informative dashboard.

---

## Phase 12: Testing & Polish

**Goal**: Comprehensive testing and production readiness.

**Tasks**:

1. Write unit tests for calculation functions (mileage, currency formatting)
2. Write unit tests for validation logic
3. Write unit tests for React components
4. Write integration tests for API routes (MSW for external APIs)
5. Write E2E tests for critical flows:
   - Submit expense report (login → create → add expenses → submit)
   - Approve report (login as admin → approve → verify sync)
   - Reject and resubmit
6. Write property-based tests for correctness properties (CP1-CP10)
7. Test camera capture across browsers
8. Verify keyboard navigation throughout
9. Test screen reader announcements
10. Fix any accessibility issues found
11. Add loading states for all async operations
12. Implement error boundaries for graceful failure
13. Review and improve error messages

**Deliverable**: Production-ready application with comprehensive test coverage.

---

## Phase Dependencies

```
Phase 1 (Auth) ──────────────────────────────────────────────────┐
    │                                                            │
    ▼                                                            │
Phase 2 (Database + CRUD) ───────────────────────────────────────┤
    │                                                            │
    ├──────────────────┬──────────────────┐                      │
    ▼                  ▼                  ▼                      │
Phase 3            Phase 6            Phase 7                    │
(Out-of-pocket)    (Mileage)          (QBO Setup/Sandbox)        │
    │                  │                  │                      │
    ▼                  │                  ▼                      │
Phase 4                │              Phase 7b                   │
(Claude Vision)        │              (QBO Production) ─────┐    │
    │                  │                                    │    │
    ▼                  │                                    │    │
Phase 5                │                                    │    │
(Camera)               │                                    │    │
    │                  │                                    │    │
    └──────────────────┴────────────────────────────────────│────┘
                       │                                    │
                       ▼                                    │
              Phase 8 (Approval Workflow) ◀─────────────────┘
                       │
                       ├────────────────────┐
                       ▼                    ▼
              Phase 9 (Notifications)   Phase 10 (QBO Bill Sync)
                       │                    │
                       └────────────────────┘
                                │
                                ▼
                       Phase 11 (Admin/Dashboard)
                                │
                                ▼
                       Phase 12 (Testing)
```

**Note**: Phase 7b (QBO Production) can be started once Phase 7 is complete but may take
time for Intuit approval. Phase 10 (QBO Bill Sync) requires Phase 7b completion for
production bill creation.

---

## Risk Areas & Mitigation

| Risk                          | Impact | Mitigation                                                           |
| ----------------------------- | ------ | -------------------------------------------------------------------- |
| QBO OAuth complexity          | Medium | Follow Intuit's Node.js SDK examples; test with sandbox first        |
| QBO production approval delay | High   | Start Phase 7b early; prepare legal docs in advance; have all other phases ready |
| Claude Vision accuracy        | Low    | Always allow manual override; confidence indicators set expectations |
| Camera access across browsers | Medium | Provide file upload fallback; test early on target browsers          |
| Google Maps API costs         | Low    | Distance Matrix is cheap; cache results where possible               |
| Zitadel configuration         | Low    | Document steps; similar to App Portal setup                          |

---

## Success Criteria

- [ ] End-to-end workflow: Submit → Approve → Bill appears in QBO
- [ ] Receipt capture works via camera and file upload
- [ ] Mileage calculation is accurate
- [ ] Categories and projects sync from QBO
- [ ] All correctness properties (CP1-CP10) verified by tests
- [ ] E2E tests pass for critical user journeys
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Error handling provides clear user feedback
- [ ] Admin can configure IRS mileage rate
- [ ] Notifications keep users informed of status changes
