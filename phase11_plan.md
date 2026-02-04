# Phase 11 Execution Plan: Admin Settings & Dashboard

> **Goal**: Build admin configuration and overview dashboard with report filtering capabilities.

**Phase Dependencies**:
- Phase 9 (Notifications): Complete - notification system exists
- Phase 10 (QBO Bill Sync): Complete - sync functionality exists

---

## Current State Assessment

### Already Implemented
- Dashboard at `/` with status counts, recent reports, quick actions
- Mileage rate backend: `GET/PUT /api/settings/mileage-rate` (admin-protected)
- Settings table schema with flexible key/value storage
- `getMileageRate()` and `setMileageRate()` query functions
- Admin role checks in layouts and API routes
- Navigation with admin-only items
- QBO admin page at `/admin/qbo`

### Missing (To Build)
1. **Admin Settings Page** - UI for mileage rate configuration
2. **Report Filtering** - Filter by status and date range on My Reports page
3. **Enhanced Dashboard** - Admin-specific view with settings link
4. **Navigation Updates** - Proper admin section organization

---

## Tasks

### Task 1: Create Admin Settings Page

**Files to Create:**
- `src/app/(protected)/admin/settings/page.tsx` - Admin settings page

**Files to Modify:**
- `src/components/layout/nav.tsx` - Update Settings nav link

**Implementation Details:**

1. Create server component page at `/admin/settings`
2. Display current mileage rate with effective date
3. Show "Last updated by" information (user who made change)
4. Create form for updating mileage rate
5. Use existing `/api/settings/mileage-rate` endpoint
6. Show success/error feedback on save

**Acceptance Criteria (from R12):**
- [x] AC1: Admin settings page accessible only to admin users (via layout)
- [ ] AC2: Admins can configure the IRS mileage reimbursement rate
- [ ] AC3: Display current rate and effective date
- [ ] AC4: Validate rate is a positive decimal number
- [ ] AC5: Rate changes apply to new expenses only (already implemented in backend)

---

### Task 2: Create Mileage Rate Settings Form Component

**Files to Create:**
- `src/components/admin/mileage-rate-form.tsx` - Client component for rate editing

**Implementation Details:**

1. Client component with form state management
2. Number input for rate (step 0.01, min 0.01, max 10)
3. Date picker for effective date
4. Show current rate while editing new rate
5. Validation feedback (positive number, valid date)
6. Loading state during save
7. Toast notification on success/error

**UI Requirements:**
- Input for rate with "$" prefix and "/mile" suffix
- Date picker for effective date
- Current rate displayed prominently
- Clear save and cancel buttons
- Confirmation before overwriting

---

### Task 3: Reorganize Admin Navigation

**Files to Modify:**
- `src/components/layout/nav.tsx` - Update admin nav items

**Changes:**
```typescript
// Current:
{ href: '/admin/qbo', label: 'Settings', testId: 'nav-admin', adminOnly: true },

// Updated:
{ href: '/admin/settings', label: 'Settings', testId: 'nav-settings', adminOnly: true },
```

The Settings nav link should go to `/admin/settings` which is the general settings page. QBO connection will be accessible from within the settings page.

---

### Task 4: Add Report Filtering to My Reports Page

**Files to Create:**
- `src/components/reports/report-filters.tsx` - Filter controls component

**Files to Modify:**
- `src/app/(protected)/reports/page.tsx` - Add filter state and controls
- `src/lib/db/queries/reports.ts` - Add filtered query function

**Implementation Details:**

1. Create filter bar with:
   - Status dropdown (All, Open, Submitted, Approved, Rejected)
   - Date range picker (From/To dates for created date)
   - Clear filters button

2. Make reports page use URL search params for filters:
   - `?status=open` - Filter by status
   - `?from=2024-01-01&to=2024-12-31` - Filter by date range
   - Filters persist in URL for sharing/bookmarking

3. Add new query function:
   ```typescript
   getFilteredReportsByUserId(
     userId: string,
     filters: {
       status?: ReportStatus
       fromDate?: Date
       toDate?: Date
     }
   )
   ```

4. Show active filter count/summary
5. Empty state when filters return no results

**Acceptance Criteria (from R14):**
- [ ] AC4: Support filtering reports by status and date range

---

### Task 5: Enhance Dashboard with Admin Links

**Files to Modify:**
- `src/app/(protected)/page.tsx` - Add admin settings link

**Implementation Details:**

1. Add "Settings" quick action for admins linking to `/admin/settings`
2. Improve admin view messaging about available admin functions
3. Keep existing dashboard structure (status counts, recent reports)

**Acceptance Criteria (from R14):**
- [x] AC1: Display dashboard as landing page (already done)
- [x] AC2: Show submitter summary counts, recent reports, quick actions (already done)
- [ ] AC3: Show admins pending approval count, reports awaiting review, link to admin settings
- [ ] AC4: Support filtering (handled in Task 4)

---

### Task 6: Add Date Range Picker Component

**Files to Create:**
- `src/components/ui/date-range-picker.tsx` - Reusable date range picker

**Implementation Details:**

1. Use shadcn/ui Calendar and Popover components
2. Allow selecting start and end dates
3. Support preset ranges (This week, This month, Last 30 days, Custom)
4. Clear button to reset selection
5. Accessible keyboard navigation

---

### Task 7: Create Admin Settings Layout/Index

**Files to Create:**
- `src/app/(protected)/admin/settings/layout.tsx` - Settings section layout (if needed for tabs)

**Implementation Details:**

If the settings page grows complex, create a tabbed layout:
- General Settings (mileage rate)
- QuickBooks Online (existing QBO page content)

For now, start simple with single page and link to QBO.

---

## Testing Requirements

### Unit Tests
**Files to Create:**
- `src/components/admin/mileage-rate-form.test.tsx`
- `src/components/reports/report-filters.test.tsx`
- `src/lib/db/queries/reports.test.ts` (add filtered query tests)

**Test Cases:**
1. Mileage rate form:
   - Renders current rate
   - Validates positive number input
   - Shows error for invalid values
   - Submits correctly formatted data
   - Shows loading state during save

2. Report filters:
   - Renders all filter options
   - Updates URL params on filter change
   - Clear filters resets all
   - Status filter shows correct options
   - Date range validates from <= to

3. Filtered reports query:
   - Returns all reports when no filter
   - Filters by single status
   - Filters by date range
   - Combines status and date filters
   - Handles edge cases (no results, null dates)

### Integration Tests
**Files to Create/Modify:**
- `src/app/api/settings/mileage-rate/route.test.ts` (if not exists)

**Test Cases:**
1. GET returns current rate for any authenticated user
2. PUT rejects non-admin users
3. PUT validates input
4. PUT updates rate correctly
5. Updated rate used in new mileage calculations

### E2E Tests
**Files to Create:**
- `e2e/admin-settings.spec.ts`
- `e2e/report-filtering.spec.ts`

**Test Cases:**
1. Admin settings flow:
   - Admin can navigate to settings
   - Admin can view current mileage rate
   - Admin can update mileage rate
   - Non-admin cannot access settings

2. Report filtering flow:
   - User can filter reports by status
   - User can filter reports by date range
   - Filters persist in URL
   - Clear filters works
   - Combined filters work

---

## File Summary

### New Files (9)
1. `src/app/(protected)/admin/settings/page.tsx`
2. `src/components/admin/mileage-rate-form.tsx`
3. `src/components/reports/report-filters.tsx`
4. `src/components/ui/date-range-picker.tsx`
5. `src/components/admin/mileage-rate-form.test.tsx`
6. `src/components/reports/report-filters.test.tsx`
7. `e2e/admin-settings.spec.ts`
8. `e2e/report-filtering.spec.ts`
9. `src/app/(protected)/admin/settings/layout.tsx` (optional)

### Modified Files (4)
1. `src/components/layout/nav.tsx` - Update Settings link
2. `src/app/(protected)/reports/page.tsx` - Add filtering
3. `src/lib/db/queries/reports.ts` - Add filtered query
4. `src/app/(protected)/page.tsx` - Add admin settings link

---

## Implementation Order

1. **Task 6**: Date range picker component (dependency for filtering)
2. **Task 2**: Mileage rate form component
3. **Task 1**: Admin settings page
4. **Task 3**: Update navigation
5. **Task 4**: Report filtering
6. **Task 5**: Dashboard enhancements
7. **Task 7**: Settings layout organization (if needed)
8. **Tests**: Write all tests

---

## Acceptance Criteria Summary

### R12: Admin Settings
| AC | Description | Status |
|----|-------------|--------|
| AC1 | Admin settings page accessible only to admin users | Pending |
| AC2 | Admins can configure IRS mileage reimbursement rate | Pending |
| AC3 | Display current rate and effective date | Pending |
| AC4 | Validate rate is positive decimal number | Pending |
| AC5 | Rate changes apply to new expenses only | Done (backend) |

### R14: Dashboard and Reporting
| AC | Description | Status |
|----|-------------|--------|
| AC1 | Display dashboard as landing page after login | Done |
| AC2 | Show submitters: summary counts, recent reports, quick actions | Done |
| AC3 | Show admins: pending count, reports awaiting review, settings link | Partial |
| AC4 | Support filtering reports by status and date range | Pending |

---

## Design Decisions

### Settings Page Organization
The admin settings page will be a simple single page initially with:
- Mileage Rate section (primary focus for Phase 11)
- Link to QBO Settings (existing page)

This keeps the scope focused while providing a foundation for future settings.

### Filter Persistence
Using URL search params for filters because:
- Shareable/bookmarkable filtered views
- Works with server components
- Browser back/forward navigation works
- No client state management complexity

### Date Range Presets
Including preset options (This month, Last 30 days, etc.) to improve UX for common filtering scenarios.

---

## Open Questions

1. **Settings page tabs**: Should QBO settings be a tab on the new settings page, or remain separate? Recommendation: Keep separate for now, link from settings page.

2. **Filter defaults**: Should the reports page remember last used filters (localStorage)? Recommendation: No, keep it simple with URL params only.

3. **Rate history**: Should we maintain a history of rate changes? Current implementation only stores current rate. Recommendation: Out of scope for Phase 11, but the settings table could support this in future.

---

## Dependencies to Verify

Before starting implementation, verify:

1. [ ] Phase 9 notifications working correctly
2. [ ] Phase 10 QBO sync working correctly
3. [ ] Existing mileage rate API returning correct data
4. [ ] Admin role properly detected in session
5. [ ] shadcn/ui Calendar component installed

---

## Deliverable

When Phase 11 is complete:
- Admins can configure the IRS mileage rate from a dedicated settings page
- All users see the informative dashboard with status counts and recent reports
- Admins see additional quick actions including settings link
- Users can filter their reports by status and date range
- All features are tested with unit, integration, and E2E tests
