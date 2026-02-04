# Phase 9 Execution Plan: In-App Notifications

> **Goal**: Keep users informed about report status changes.

## Current State Analysis

Phase 8 implemented the majority of the notification system:

| Task | Status | Notes |
|------|--------|-------|
| Notification indicator in app header | **DONE** | `NotificationBell` component in header |
| Display unread notification count | **DONE** | Badge shows count (up to 99+) |
| Notifications dropdown/panel | **DONE** | Popover with scrollable list |
| Notification on report submission (for admins) | **NOT DONE** | Function exists but not wired up |
| Notification on approval (for submitter) | **DONE** | Called from approve API route |
| Notification on rejection (for submitter) | **DONE** | Called from reject API route |
| Mark-as-read functionality | **DONE** | Individual and bulk mark-as-read |
| Link notifications to relevant reports | **DONE** | Each notification links to report |

### Key Gap: Admin Notification on Report Submission

The `notifyReportSubmitted` function exists in [notifications.ts](src/lib/db/queries/notifications.ts:147) but requires `adminUserIds[]` parameter. Currently there's no mechanism to identify admin users because:
- Authentication uses Zitadel (external IdP)
- No users table exists in the database
- Admin role is determined at login from JWT claims

---

## Implementation Tasks

### Task 1: Create Users Table for Admin Tracking

**Purpose**: Track logged-in users and their roles so we can identify admins for notifications.

**Files to create/modify**:
- `src/lib/db/schema/users.ts` - New schema file
- `src/lib/db/schema/index.ts` - Export users schema
- `src/lib/db/queries/users.ts` - New query functions
- `drizzle/XXXX_add_users_table.sql` - Migration

**Schema design**:
```typescript
users {
  id: string (primary key, Zitadel sub)
  email: string
  name: string
  role: 'user' | 'admin'
  lastLoginAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

Index on: role (for querying admins)
```

**Query functions needed**:
- `upsertUser(user)` - Create or update user on login
- `getAdminUserIds()` - Get all user IDs with admin role
- `getUserById(id)` - Get user by ID

**Acceptance criteria**:
- [ ] Users table created with proper schema
- [ ] Migration runs successfully
- [ ] Query functions work correctly

---

### Task 2: Track User Logins

**Purpose**: Populate users table when users log in.

**Files to modify**:
- `src/lib/auth.ts` - Add signIn callback to track users

**Implementation**:
Add to NextAuth callbacks:
```typescript
async signIn({ user, account, profile }) {
  // Upsert user in database with current role
  await upsertUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: extractRole(profile.roles),
  })
  return true
}
```

**Acceptance criteria**:
- [ ] User record created/updated on each login
- [ ] Role is correctly extracted and stored
- [ ] lastLoginAt is updated

---

### Task 3: Wire Up Admin Notification on Submit

**Purpose**: Notify all admin users when a report is submitted for approval.

**Files to modify**:
- `src/app/api/reports/[id]/submit/route.ts` - Add notification call
- `src/lib/db/queries/reports.ts` - Return submitter info for notification

**Implementation**:
```typescript
// In submit route, after submitReport():
const adminIds = await getAdminUserIds()
if (adminIds.length > 0) {
  await notifyReportSubmitted(
    adminIds,
    report.id,
    report.name,
    session.user.name || session.user.email
  )
}
```

**Acceptance criteria**:
- [ ] When a report is submitted, all admins receive a notification
- [ ] Notification message includes submitter name and report name
- [ ] Notification links to the report in approval queue
- [ ] If no admins exist, submission still succeeds (graceful failure)

---

### Task 4: Update NotificationItem for Submit Type

**Purpose**: Ensure the UI properly handles `report_submitted` notification type.

**Files to verify/modify**:
- `src/components/notifications/notification-item.tsx` - Verify icon and styling

**Verification**:
- Check that `report_submitted` type has appropriate icon (should be FileText)
- Verify notification links to correct admin approval route

**Acceptance criteria**:
- [ ] `report_submitted` notifications display with file icon
- [ ] Clicking notification navigates to `/admin/approvals/[id]`
- [ ] Notification message displays correctly

---

### Task 5: Write Unit Tests for Notifications

**Purpose**: Ensure notification logic is tested.

**Files to create**:
- `src/lib/db/queries/__tests__/notifications.test.ts`
- `src/lib/db/queries/__tests__/users.test.ts`

**Test cases for notifications**:
- `createNotification` creates a notification with correct fields
- `getNotificationsForUser` returns notifications in descending order
- `getUnreadNotificationCount` returns correct count
- `markNotificationAsRead` updates read status
- `markAllNotificationsAsRead` marks all as read
- `notifyReportApproved` creates notification with correct message
- `notifyReportRejected` creates notification with comment preview
- `notifyReportSubmitted` creates notifications for all admins

**Test cases for users**:
- `upsertUser` creates new user
- `upsertUser` updates existing user
- `getAdminUserIds` returns only admin IDs
- `getUserById` returns correct user

**Acceptance criteria**:
- [ ] All notification query functions have tests
- [ ] All user query functions have tests
- [ ] Tests pass in CI

---

### Task 6: Write Integration Tests for Notification API

**Purpose**: Test notification API endpoints.

**Files to create**:
- `src/app/api/notifications/__tests__/route.test.ts`

**Test cases**:
- GET `/api/notifications` returns user's notifications
- GET `/api/notifications` returns unread count
- POST `/api/notifications/[id]/read` marks notification as read
- POST `/api/notifications/read-all` marks all as read
- Unauthorized requests return 401

**Acceptance criteria**:
- [ ] API route tests pass
- [ ] Auth is properly enforced

---

### Task 7: Write E2E Test for Notification Flow

**Purpose**: End-to-end test for the full notification workflow.

**Files to create**:
- `e2e/notifications.spec.ts`

**Test scenarios**:
1. **Admin receives notification on submission**:
   - Login as regular user
   - Create report with expense
   - Submit report
   - Login as admin
   - Verify notification bell shows count
   - Click notification, verify it links to approval page

2. **Submitter receives notification on approval/rejection**:
   - (Setup: report already submitted)
   - Login as admin
   - Approve report
   - Login as submitter
   - Verify approval notification received

3. **Mark notifications as read**:
   - Login with unread notifications
   - Click notification bell
   - Mark individual as read
   - Verify count decreases
   - Mark all as read
   - Verify count is 0

**Acceptance criteria**:
- [ ] E2E tests pass
- [ ] Tests work in CI environment

---

### Task 8: Notification Cleanup Job (Optional Enhancement)

**Purpose**: Clean up old read notifications to prevent table bloat.

**Files to create**:
- `src/app/api/cron/cleanup-notifications/route.ts`

**Implementation**:
- Delete read notifications older than 30 days
- Run via Vercel Cron or manual trigger

**Note**: This is optional for Phase 9. Can be deferred if time-constrained.

---

## File Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/db/schema/users.ts` | Users table schema |
| `src/lib/db/queries/users.ts` | User query functions |
| `drizzle/XXXX_add_users_table.sql` | Database migration |
| `src/lib/db/queries/__tests__/notifications.test.ts` | Notification unit tests |
| `src/lib/db/queries/__tests__/users.test.ts` | User unit tests |
| `src/app/api/notifications/__tests__/route.test.ts` | API integration tests |
| `e2e/notifications.spec.ts` | E2E tests |

### Files to Modify
| File | Changes |
|------|---------|
| `src/lib/db/schema/index.ts` | Export users schema |
| `src/lib/auth.ts` | Add signIn callback for user tracking |
| `src/app/api/reports/[id]/submit/route.ts` | Add admin notification call |
| `src/components/notifications/notification-item.tsx` | Verify submit notification handling |

---

## Requirements Satisfied

This phase completes **R11: In-App Notifications**:

| Acceptance Criteria | Implementation |
|---------------------|----------------|
| R11.1: Display notification indicator in app header | Phase 8: NotificationBell component |
| R11.2: Show unread notification count | Phase 8: Badge with count |
| R11.3a: Notify submitter on approval | Phase 8: notifyReportApproved |
| R11.3b: Notify submitter on rejection with reason | Phase 8: notifyReportRejected |
| R11.3c: Notify admins on new submission | **Phase 9: Task 3** |
| R11.4: Mark notifications as read | Phase 8: markAsRead functions |
| R11.5: Link notifications to relevant reports | Phase 8: reportId + click handler |

---

## Dependencies on Previous Phases

### Phase 8 (Report Submission & Approval Workflow)
- [x] Submit report changes status to 'submitted' - **Verified**
- [x] Approve/reject routes exist and work - **Verified**
- [x] Notification database schema exists - **Verified**
- [x] Notification API routes exist - **Verified**
- [x] NotificationBell component in header - **Verified**

### Phase 2 (Database Schema)
- [x] Drizzle ORM configured - **Verified**
- [x] Migration system in place - **Verified**

### Phase 1 (Authentication)
- [x] Zitadel auth working - **Verified**
- [x] Role extraction from JWT - **Verified**

---

## Execution Order

1. **Task 1**: Create users table and migration
2. **Task 2**: Wire up user tracking on login
3. **Task 3**: Add admin notification on submit
4. **Task 4**: Verify notification UI for submit type
5. **Task 5**: Write unit tests
6. **Task 6**: Write integration tests
7. **Task 7**: Write E2E tests
8. **Task 8**: (Optional) Notification cleanup job

---

## Estimated Scope

- **Core functionality**: Tasks 1-4 (primary deliverables)
- **Testing**: Tasks 5-7 (quality assurance)
- **Optional**: Task 8 (nice-to-have)

The core functionality is relatively small since Phase 8 did the heavy lifting. Most of Phase 9 is completing the admin notification gap and adding comprehensive tests.

---

## Testing Checklist

Before marking Phase 9 complete:

- [ ] Users table created and migration applied
- [ ] User login tracking working (verify in database)
- [ ] Submit a report → admin receives notification
- [ ] Approve a report → submitter receives notification
- [ ] Reject a report → submitter receives notification with reason
- [ ] Notification count displays correctly
- [ ] Click notification → navigates to correct report
- [ ] Mark as read → count decreases
- [ ] Mark all as read → count goes to 0
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E test passes
