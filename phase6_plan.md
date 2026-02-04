# Phase 6 Execution Plan: Mileage Expense Entry

> **Goal**: Allow users to add mileage expenses with automatic distance calculation via Google Maps API.

## Phase Dependencies

### Prerequisites from Previous Phases

| Phase | Dependency | Status | Verification Needed |
|-------|-----------|--------|---------------------|
| Phase 2 | `expenses` table schema with mileage fields | Complete | Verify `originAddress`, `destinationAddress`, `miles` columns exist |
| Phase 2 | `settings` table for IRS mileage rate | Complete | Verify table exists; need to add query functions |
| Phase 2 | Report CRUD with expense relationships | Complete | Can add expenses to reports |
| Phase 7 | QBO categories and projects | **Complete** | `useCategories()` and `useProjects()` hooks available |

---

## QBO Integration Available (Phase 7 Complete)

**Phase 7 has been completed ahead of schedule.** This means:

- ✅ 44 categories syncing from QBO sandbox
- ✅ `useCategories()` hook built and working
- ✅ `useProjects()` hook built and working
- ✅ Fallback chain implemented: QBO → Cache → Hardcoded
- ✅ `src/lib/categories.ts` exists as safety net fallback

**Impact on Phase 6:**
- Skip creating hardcoded placeholder data for projects
- Use `useProjects()` hook directly in mileage expense form
- Real QBO data available from day one for realistic testing

---

### Shared Infrastructure with Phase 3

Phase 6 (Mileage) runs in parallel with Phase 3 (Out-of-pocket) per the implementation plan. These phases will share:

1. **Expense list component** - Displays expenses within a report
2. **Expense total calculation** - Sums all expense amounts
3. **Base expense API routes** - CRUD for expenses table
4. **Expense type handling** - Distinguishing `mileage` vs `out_of_pocket`

**Recommendation**: Build shared expense infrastructure first, then add mileage-specific functionality.

---

## Task Breakdown

### Task 1: Settings Query Functions & IRS Rate API

**Purpose**: Enable reading/updating the IRS mileage rate used for calculations.

**Files to Create/Modify**:
- `src/lib/db/queries/settings.ts` (new)
- `src/lib/validations/settings.ts` (new)
- `src/app/api/settings/mileage-rate/route.ts` (new)

**Implementation Details**:

```typescript
// src/lib/db/queries/settings.ts
export async function getSetting<T>(key: string): Promise<T | null>
export async function setSetting<T>(key: string, value: T, userId: string): Promise<void>
export async function getMileageRate(): Promise<{ rate: number; effectiveDate: string }>
```

**Default IRS Rate**: $0.70/mile for 2025 (seed if not exists)

**Tests to Write**:
- `src/lib/db/queries/__tests__/settings.test.ts`
  - Test getSetting returns null for missing keys
  - Test setSetting creates new settings
  - Test getMileageRate returns current rate
  - Test default rate seeding

---

### Task 2: Google Maps Distance Matrix API Integration

**Purpose**: Calculate driving distance between addresses.

**Files to Create**:
- `src/lib/google-maps/distance.ts` (new)
- `src/lib/google-maps/types.ts` (new)

**Implementation Details**:

```typescript
// src/lib/google-maps/distance.ts
interface DistanceResult {
  distanceMeters: number
  distanceMiles: number
  durationSeconds: number
  originFormatted: string
  destinationFormatted: string
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'ERROR'
}

export async function calculateDistance(
  origin: string,
  destination: string,
  waypoints?: string[]
): Promise<DistanceResult>
```

**API Configuration**:
- Server-side only (API key not exposed to client)
- Use `GOOGLE_MAPS_API_KEY` environment variable
- Handle rate limiting and errors gracefully
- Cache results where appropriate (same route = same distance)

**Tests to Write**:
- `src/lib/google-maps/__tests__/distance.test.ts`
  - Mock Distance Matrix API responses
  - Test successful distance calculation
  - Test handling of invalid addresses
  - Test waypoint routing
  - Test error handling for API failures

---

### Task 3: Google Places Autocomplete Integration

**Purpose**: Provide address suggestions as user types.

**Files to Create**:
- `src/lib/google-maps/places.ts` (new)
- `src/app/api/places/autocomplete/route.ts` (new)
- `src/components/ui/address-autocomplete.tsx` (new)

**Implementation Details**:

The Places API requires client-side interaction but we'll proxy through our API to protect the key:

```typescript
// src/app/api/places/autocomplete/route.ts
// GET /api/places/autocomplete?input=123+Main
// Returns array of place predictions

// src/components/ui/address-autocomplete.tsx
// Debounced input that queries API and shows dropdown
interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}
```

**UX Requirements**:
- Debounce input (300ms) to avoid excessive API calls
- Show loading state while fetching
- Display formatted address suggestions
- Allow selection via keyboard or click
- Handle no results gracefully

**Tests to Write**:
- `src/components/ui/__tests__/address-autocomplete.test.tsx`
  - Test debounced API calls
  - Test selection behavior
  - Test keyboard navigation
  - Test empty state

---

### Task 4: Expense API Routes (Shared with Phase 3)

**Purpose**: CRUD operations for expenses within a report.

**Files to Create**:
- `src/lib/db/queries/expenses.ts` (new)
- `src/lib/validations/expenses.ts` (new)
- `src/app/api/reports/[id]/expenses/route.ts` (new)
- `src/app/api/reports/[id]/expenses/[expenseId]/route.ts` (new)

**Implementation Details**:

```typescript
// src/lib/validations/expenses.ts
export const createMileageExpenseSchema = z.object({
  type: z.literal('mileage'),
  date: z.string().date(), // ISO date string
  originAddress: z.string().min(1, 'Origin address is required'),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  miles: z.number().positive().max(999, 'Maximum 999 miles'),
  amount: z.number().positive(), // Calculated: miles × rate
  memo: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  billable: z.boolean().default(false),
})

// Validation: billable requires projectId
.refine(
  (data) => !data.billable || data.projectId,
  { message: 'Billable expenses must have a project' }
)
```

**API Endpoints**:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/reports/[id]/expenses` | Create expense |
| GET | `/api/reports/[id]/expenses` | List expenses for report |
| GET | `/api/reports/[id]/expenses/[expenseId]` | Get single expense |
| PUT | `/api/reports/[id]/expenses/[expenseId]` | Update expense |
| DELETE | `/api/reports/[id]/expenses/[expenseId]` | Delete expense |

**Authorization Rules**:
- User must own the report
- Report must be in "open" status
- Cannot modify expenses on submitted/approved/rejected reports

**Tests to Write**:
- `src/lib/validations/__tests__/expenses.test.ts`
  - Test mileage expense validation
  - Test required fields
  - Test max miles constraint
  - Test billable/project relationship
- `src/app/api/reports/[id]/expenses/__tests__/route.test.ts`
  - Test create expense
  - Test list expenses
  - Test authorization checks
  - Test status restrictions

---

### Task 5: Distance Calculation API Route

**Purpose**: Calculate distance between addresses before saving expense.

**Files to Create**:
- `src/app/api/distance/route.ts` (new)

**Implementation Details**:

```typescript
// POST /api/distance
// Request: { origin: string, destination: string, waypoints?: string[] }
// Response: { miles: number, amount: number, formatted: { origin, destination } }

export async function POST(request: Request) {
  // 1. Validate request body
  // 2. Call Google Maps Distance Matrix
  // 3. Get current IRS mileage rate
  // 4. Calculate amount = miles × rate
  // 5. Return result
}
```

**Error Handling**:
- Invalid addresses: Return 400 with user-friendly message
- API failure: Return 503 with retry suggestion
- Rate limiting: Queue or throttle requests

**Tests to Write**:
- `src/app/api/distance/__tests__/route.test.ts`
  - Test successful calculation
  - Test invalid address handling
  - Test API error handling

---

### Task 6: Mileage Expense Form Component

**Purpose**: UI for entering mileage expense details.

**Files to Create**:
- `src/components/expenses/mileage-expense-form.tsx` (new)

**Implementation Details**:

```typescript
interface MileageExpenseFormProps {
  reportId: string
  expense?: Expense // For edit mode
  onSuccess: () => void
  onCancel: () => void
}

// Use existing QBO hooks for projects (Phase 7 complete)
import { useProjects } from '@/hooks/useProjects'
const { projects, isLoading: projectsLoading } = useProjects()
```

**Form Fields**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | date picker | Yes | Default to today |
| Origin | address autocomplete | Yes | Start address |
| Destination | address autocomplete | Yes | End address |
| Add Stop | button | No | Adds waypoint field |
| Calculate | button | - | Triggers distance API |
| Miles | number input | Yes | Auto-filled, editable (max 999) |
| Amount | display only | - | Calculated: miles × rate |
| Memo | textarea | No | Trip purpose/notes |
| Project | select | No | **Uses `useProjects()` hook** (QBO data with fallback) |
| Billable | checkbox | No | Only when project selected |

**UX Flow**:
1. User enters origin address (autocomplete)
2. User enters destination address (autocomplete)
3. Optionally adds stops via "Add Stop" button
4. Clicks "Calculate Distance" button
5. System displays calculated miles and amount
6. User can manually adjust miles if needed (with warning)
7. User fills optional fields (memo, project)
8. User saves expense

**Visual States**:
- Empty: No addresses entered
- Ready to calculate: Both addresses entered
- Calculating: Loading spinner
- Calculated: Show miles and amount prominently
- Manual override: Show warning that distance was manually adjusted
- Error: Show error message with retry option

**Tests to Write**:
- `src/components/expenses/__tests__/mileage-expense-form.test.tsx`
  - Test form submission
  - Test address autocomplete integration
  - Test distance calculation trigger
  - Test manual override
  - Test validation errors
  - Test edit mode

---

### Task 7: Expense List Component (Shared with Phase 3)

**Purpose**: Display list of expenses within a report.

**Files to Create**:
- `src/components/expenses/expense-list.tsx` (new)
- `src/components/expenses/expense-card.tsx` (new)
- `src/components/expenses/expense-total.tsx` (new)

**Implementation Details**:

```typescript
// expense-list.tsx
interface ExpenseListProps {
  reportId: string
  expenses: Expense[]
  editable: boolean // false for submitted/approved reports
  onExpenseUpdated: () => void
}

// expense-card.tsx - Renders single expense
// Different display for mileage vs out-of-pocket
// Shows: type icon, date, amount, summary (merchant or route)
// Edit/delete actions if editable

// expense-total.tsx
interface ExpenseTotalProps {
  expenses: Expense[]
}
// Shows count and sum of all expenses
```

**Tests to Write**:
- `src/components/expenses/__tests__/expense-list.test.tsx`
- `src/components/expenses/__tests__/expense-card.test.tsx`
- `src/components/expenses/__tests__/expense-total.test.tsx`

---

### Task 8: Report Detail Page Integration

**Purpose**: Integrate expense management into report detail page.

**Files to Modify**:
- `src/app/(protected)/reports/[id]/page.tsx`

**Changes**:
1. Fetch expenses for the report
2. Display expense list component
3. Add "Add Mileage Expense" button (links to form or opens modal)
4. Show expense total
5. Conditionally show edit/delete actions based on report status

**Tests to Write**:
- Update existing page tests to include expense display

---

### Task 9: Add Mileage Page/Modal

**Purpose**: Dedicated interface for adding mileage expense.

**Option A: Separate Page**
- `src/app/(protected)/reports/[id]/expenses/new/mileage/page.tsx`
- Navigate away from report, return after save

**Option B: Modal/Dialog (Recommended)**
- Use shadcn/ui Dialog component
- Stay on report page
- Better UX for adding multiple expenses

**Files to Create**:
- `src/components/expenses/add-mileage-dialog.tsx` (new)

---

### Task 10: Environment Variable Configuration

**Purpose**: Ensure Google Maps API key is configured.

**Files to Modify**:
- `.env.example` - Document required variable
- `.env.local` - Add actual API key (not committed)

**Required Configuration**:
```bash
# Google Maps API - Required for mileage calculation
GOOGLE_MAPS_API_KEY=your_api_key_here
```

**API Key Requirements**:
- Enable Distance Matrix API
- Enable Places API (for autocomplete)
- Restrict to server-side usage
- Set appropriate quotas

---

## File Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/db/queries/settings.ts` | Settings CRUD functions |
| `src/lib/db/queries/expenses.ts` | Expense CRUD functions |
| `src/lib/validations/settings.ts` | Settings validation schemas |
| `src/lib/validations/expenses.ts` | Expense validation schemas |
| `src/lib/google-maps/distance.ts` | Distance Matrix API client |
| `src/lib/google-maps/places.ts` | Places API client |
| `src/lib/google-maps/types.ts` | Google Maps type definitions |
| `src/app/api/settings/mileage-rate/route.ts` | IRS rate API endpoint |
| `src/app/api/reports/[id]/expenses/route.ts` | Expense list/create API |
| `src/app/api/reports/[id]/expenses/[expenseId]/route.ts` | Expense get/update/delete API |
| `src/app/api/distance/route.ts` | Distance calculation API |
| `src/app/api/places/autocomplete/route.ts` | Address autocomplete API |
| `src/components/ui/address-autocomplete.tsx` | Autocomplete input component |
| `src/components/expenses/mileage-expense-form.tsx` | Mileage entry form |
| `src/components/expenses/expense-list.tsx` | Expense list display |
| `src/components/expenses/expense-card.tsx` | Single expense display |
| `src/components/expenses/expense-total.tsx` | Expense sum display |
| `src/components/expenses/add-mileage-dialog.tsx` | Add mileage modal |

### Existing Files (From Phase 7 - No Changes Needed)

| File | Purpose |
|------|---------|
| `src/hooks/useProjects.ts` | Projects hook (already exists) |
| `src/lib/categories.ts` | Hardcoded fallback data (already exists) |
| `src/app/api/qbo/projects/route.ts` | Projects API (already exists) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/(protected)/reports/[id]/page.tsx` | Add expense list and actions |
| `.env.example` | Document Google Maps API key |

### Test Files to Create

| File | Coverage |
|------|----------|
| `src/lib/db/queries/__tests__/settings.test.ts` | Settings queries |
| `src/lib/db/queries/__tests__/expenses.test.ts` | Expense queries |
| `src/lib/validations/__tests__/settings.test.ts` | Settings validation |
| `src/lib/validations/__tests__/expenses.test.ts` | Expense validation |
| `src/lib/google-maps/__tests__/distance.test.ts` | Distance calculation |
| `src/app/api/distance/__tests__/route.test.ts` | Distance API |
| `src/app/api/reports/[id]/expenses/__tests__/route.test.ts` | Expense API |
| `src/components/ui/__tests__/address-autocomplete.test.tsx` | Autocomplete component |
| `src/components/expenses/__tests__/mileage-expense-form.test.tsx` | Mileage form |
| `src/components/expenses/__tests__/expense-list.test.tsx` | Expense list |
| `src/components/expenses/__tests__/expense-card.test.tsx` | Expense card |

---

## Acceptance Criteria Mapping

### From R4: Mileage Expense Entry

| Criteria | Task | Verification |
|----------|------|--------------|
| Allow users to add mileage expenses to an Open report | Tasks 4, 6 | Create mileage expense via form |
| Accept origin and destination addresses | Task 6 | Form has address autocomplete fields |
| Support multiple stops (waypoints) | Tasks 2, 6 | "Add Stop" button in form |
| Call Google Maps Distance Matrix API | Tasks 2, 5 | Distance calculated on demand |
| Apply configured IRS mileage rate | Tasks 1, 5 | Rate fetched from settings |
| Display calculated distance and amount before saving | Task 6 | Calculation preview in form |
| Allow manual override of calculated distance | Task 6 | Editable miles field |
| Enforce maximum 999 miles | Task 4 | Zod validation |
| Require: origin, destination, date, miles | Task 4 | Form validation |
| Support optional: memo, project, billable | Tasks 4, 6 | Optional form fields |

### From R12: Admin Settings (Partial)

| Criteria | Task | Verification |
|----------|------|--------------|
| Configure IRS mileage rate | Task 1 | API endpoint exists |
| Apply rate to new mileage expenses only | Task 5 | Rate fetched at calculation time |

### From CP5: Billable Requires Project

| Criteria | Task | Verification |
|----------|------|--------------|
| Billable = true requires project | Task 4 | Zod refinement validation |

### From CP10: Mileage Calculation Consistency

| Criteria | Task | Verification |
|----------|------|--------------|
| Amount = miles × IRS rate | Tasks 1, 5 | Calculation in distance API |

---

## Execution Order

Recommended implementation sequence:

### Day 1: Foundation
1. **Task 1**: Settings query functions & mileage rate API
2. **Task 2**: Google Maps Distance Matrix integration
3. **Task 10**: Environment configuration

### Day 2: API Layer
4. **Task 4**: Expense API routes (CRUD)
5. **Task 5**: Distance calculation API route

### Day 3: Address Autocomplete
6. **Task 3**: Places autocomplete integration
7. Write tests for Tasks 1-5

### Day 4: UI Components
8. **Task 7**: Expense list/card/total components
9. **Task 6**: Mileage expense form component

### Day 5: Integration & Polish
10. **Task 8**: Report detail page integration
11. **Task 9**: Add mileage dialog
12. Write remaining component tests
13. Manual testing and bug fixes

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Google Maps API quota limits | Implement caching for repeated routes; debounce autocomplete |
| Invalid address handling | Validate addresses via Places API before distance calc |
| Manual override creates incorrect amounts | Store both calculated and final miles; show warning |
| API key exposure | Server-side only; proxy through Next.js API routes |
| Slow distance calculation | Show loading state; implement timeout |

---

## Definition of Done

Phase 6 is complete when:

- [ ] User can add mileage expense to an open report
- [ ] Origin/destination use address autocomplete
- [ ] Multiple stops (waypoints) supported
- [ ] Distance calculated via Google Maps API
- [ ] IRS mileage rate applied correctly
- [ ] Manual distance override works (max 999)
- [ ] All required fields validated
- [ ] Billable checkbox requires project
- [ ] Expense appears in report detail page
- [ ] Expense total updates correctly
- [ ] All unit tests pass
- [ ] API integration tests pass
- [ ] Manual E2E testing complete
