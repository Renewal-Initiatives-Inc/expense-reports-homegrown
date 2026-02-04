# Phase 3: Out-of-Pocket Expense Entry

> **Goal**: Allow users to add out-of-pocket expenses with receipt image upload.
>
> **Deliverable**: User can add out-of-pocket expenses with receipts to a report.

---

## Prerequisites Verification

Before starting Phase 3, verify these Phase 2 deliverables are working:

- [ ] User can create expense reports (`POST /api/reports`)
- [ ] User can view report list (`GET /api/reports`)
- [ ] User can view report detail (`GET /api/reports/[id]`)
- [ ] Report detail page shows expense placeholder
- [ ] Database schema includes `expenses` table with all required fields
- [ ] Only open reports can be modified

---

## QBO Integration Available (Phase 7 Complete)

**Phase 7 has been completed ahead of schedule.** This means:

- ✅ 44 categories syncing from QBO sandbox
- ✅ `useCategories()` hook built and working
- ✅ `useProjects()` hook built and working
- ✅ Fallback chain implemented: QBO → Cache → Hardcoded
- ✅ `src/lib/categories.ts` exists as safety net fallback

**Impact on Phase 3:**
- Skip creating hardcoded placeholder data (already exists as fallback)
- Use `useCategories()` and `useProjects()` hooks directly in expense forms
- Real QBO data available from day one for realistic testing

---

## Task Breakdown

### Task 1: Set Up Vercel Blob for File Storage

**Files to create/modify:**
- `package.json` - Add `@vercel/blob` dependency
- `src/lib/blob.ts` - Blob client configuration

**Implementation:**
1. Install `@vercel/blob` package
2. Add `BLOB_READ_WRITE_TOKEN` to `.env.example`
3. Create blob utility module with upload and delete functions

**Acceptance Criteria:**
- [ ] Blob client can upload files
- [ ] Blob client can delete files
- [ ] Token configured in environment

---

### Task 2: Create Expense Type Definitions and Validation Schemas

**Files to create/modify:**
- `src/types/expenses.ts` - Expense type definitions
- `src/lib/validations/expenses.ts` - Zod validation schemas

**Implementation:**

```typescript
// src/types/expenses.ts
export type ExpenseType = 'out_of_pocket' | 'mileage'

export interface Expense {
  id: string
  reportId: string
  type: ExpenseType
  amount: string
  date: string
  merchant: string | null
  memo: string | null
  categoryId: string | null
  categoryName: string | null
  projectId: string | null
  projectName: string | null
  billable: boolean
  receiptUrl: string | null
  receiptThumbnailUrl: string | null
  originAddress: string | null       // mileage only
  destinationAddress: string | null  // mileage only
  miles: string | null               // mileage only
  aiConfidence: Record<string, number> | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateExpenseInput {
  type: ExpenseType
  amount: string
  date: string
  merchant?: string
  memo?: string
  categoryId: string
  categoryName: string
  projectId?: string
  projectName?: string
  billable?: boolean
  receiptUrl?: string
  receiptThumbnailUrl?: string
}

export interface UpdateExpenseInput {
  amount?: string
  date?: string
  merchant?: string
  memo?: string
  categoryId?: string
  categoryName?: string
  projectId?: string
  projectName?: string
  billable?: boolean
}
```

**Validation rules (from requirements):**
- Out-of-pocket: amount, date, category required (R3.10)
- Billable flag only valid when project is selected (CP5)
- Amount must be positive decimal
- Date must be valid date string

**Acceptance Criteria:**
- [ ] Type definitions match database schema
- [ ] Zod schemas validate required fields for out-of-pocket
- [ ] Billable flag validation requires project

---

### Task 3: Create Expense Database Query Functions

**Files to create:**
- `src/lib/db/queries/expenses.ts` - CRUD operations for expenses

**Functions to implement:**
```typescript
// Get all expenses for a report
getExpensesByReportId(reportId: string, userId: string): Promise<Expense[]>

// Get single expense with auth check
getExpenseById(id: string, userId: string): Promise<Expense | null>

// Create new expense (checks report is open)
createExpense(reportId: string, userId: string, input: CreateExpenseInput): Promise<Expense>

// Update expense (checks report is open)
updateExpense(id: string, userId: string, input: UpdateExpenseInput): Promise<Expense | null>

// Delete expense (checks report is open)
deleteExpense(id: string, userId: string): Promise<boolean>

// Get total amount for a report
getReportTotal(reportId: string): Promise<string>
```

**Business rules:**
- User can only modify expenses on their own reports
- Expenses can only be added/modified on open reports
- Cascade delete handled by database FK constraint

**Acceptance Criteria:**
- [ ] All CRUD operations work correctly
- [ ] Authorization checks prevent cross-user access
- [ ] Status checks prevent modification of non-open reports

---

### Task 4: Create Expense API Routes

**Files to create:**
- `src/app/api/reports/[id]/expenses/route.ts` - List/Create expenses
- `src/app/api/reports/[id]/expenses/[expenseId]/route.ts` - Get/Update/Delete expense

**Endpoints:**
```
GET    /api/reports/[id]/expenses           - List expenses for report
POST   /api/reports/[id]/expenses           - Create expense
GET    /api/reports/[id]/expenses/[expenseId]     - Get single expense
PUT    /api/reports/[id]/expenses/[expenseId]     - Update expense
DELETE /api/reports/[id]/expenses/[expenseId]     - Delete expense
```

**Error handling:**
- 401: Not authenticated
- 403: Report not owned by user or not open
- 404: Report or expense not found
- 400: Validation errors

**Acceptance Criteria:**
- [ ] All endpoints require authentication
- [ ] Validation errors return detailed messages
- [ ] Status code semantics are correct

---

### Task 5: Create Receipt Upload API Route

**Files to create:**
- `src/app/api/upload/route.ts` - Receipt image upload endpoint

**Implementation:**
1. Accept multipart form data with image file
2. Validate file type (jpg, png, gif, webp, heic)
3. Validate file size (max 10MB per R3)
4. Upload to Vercel Blob with unique filename
5. Generate thumbnail (Phase 3 uses client-side resizing; server thumbnail in Phase 4)
6. Return URLs for full image and thumbnail

**Response:**
```typescript
{
  url: string           // Full-size image URL
  thumbnailUrl: string  // Thumbnail URL (same as url for now)
}
```

**Acceptance Criteria:**
- [ ] Image files upload successfully
- [ ] Invalid file types rejected with clear error
- [ ] Files over 10MB rejected
- [ ] Returns accessible URL

---

### Task 6: Use QBO-Backed Category/Project Hooks

> **Note:** Phase 7 is complete. Categories and projects are fetched from QBO with automatic fallback.

**Existing infrastructure (no new files needed):**
- `src/hooks/useCategories.ts` - Fetches categories (QBO → Cache → Hardcoded fallback)
- `src/hooks/useProjects.ts` - Fetches projects (QBO → Cache → Hardcoded fallback)
- `src/lib/categories.ts` - Hardcoded fallback data (already exists as safety net)
- `src/app/api/qbo/categories/route.ts` - Categories API endpoint
- `src/app/api/qbo/projects/route.ts` - Projects API endpoint

**Integration in expense forms:**
```typescript
// In expense-form.tsx
import { useCategories } from '@/hooks/useCategories'
import { useProjects } from '@/hooks/useProjects'

const { categories, isLoading: categoriesLoading } = useCategories()
const { projects, isLoading: projectsLoading } = useProjects()
```

**Acceptance Criteria:**
- [ ] Expense form uses `useCategories()` hook for category dropdown
- [ ] Expense form uses `useProjects()` hook for project dropdown
- [ ] Billable checkbox only shows when project selected
- [ ] Loading states handled while fetching categories/projects
- [ ] Graceful fallback if QBO unavailable (hardcoded data displays)

---

### Task 7: Create Expense Form Component

**Files to create:**
- `src/components/expenses/expense-form.tsx` - Main expense entry form

**Component requirements:**
1. Receipt image upload with preview
2. Amount input (currency formatted)
3. Date picker (default to today)
4. Category dropdown (required) - **uses `useCategories()` hook**
5. Merchant name input (optional)
6. Memo/description textarea (optional)
7. Project dropdown (optional) - **uses `useProjects()` hook**
8. Billable checkbox (only visible when project selected)
9. Form validation with inline errors
10. Submit/Cancel buttons
11. Loading states while categories/projects load

**Props:**
```typescript
interface ExpenseFormProps {
  reportId: string
  expense?: Expense  // For edit mode
  onSuccess?: () => void
  onCancel?: () => void
}
```

**Acceptance Criteria:**
- [ ] Form validates required fields before submit
- [ ] Receipt preview shows uploaded image
- [ ] Billable checkbox hidden until project selected
- [ ] Edit mode populates existing values
- [ ] Categories populated from QBO (with fallback)
- [ ] Projects populated from QBO (with fallback)

---

### Task 8: Create Receipt Upload Component

**Files to create:**
- `src/components/expenses/receipt-upload.tsx` - File picker with preview

**Component requirements:**
1. File input (hidden, triggered by button)
2. Drag and drop zone
3. Image preview after selection
4. Remove/replace image option
5. Loading state during upload
6. Error display for failed uploads
7. Accepted formats: JPEG, PNG, GIF, WebP, HEIC

**Props:**
```typescript
interface ReceiptUploadProps {
  value?: string  // Current receipt URL
  onChange: (url: string | null) => void
  disabled?: boolean
}
```

**Acceptance Criteria:**
- [ ] File picker opens on click
- [ ] Drag and drop works
- [ ] Preview displays selected image
- [ ] Can remove/replace image

---

### Task 9: Create Expense List Component

**Files to create:**
- `src/components/expenses/expense-list.tsx` - List of expenses on report

**Component requirements:**
1. Display each expense as a card/row
2. Show receipt thumbnail (clickable to view full)
3. Show amount, date, category, merchant
4. Show project and billable badge if applicable
5. Edit and delete buttons (only for open reports)
6. Empty state message

**Props:**
```typescript
interface ExpenseListProps {
  expenses: Expense[]
  reportStatus: ReportStatus
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}
```

**Acceptance Criteria:**
- [ ] All expense fields displayed
- [ ] Receipt thumbnails clickable
- [ ] Edit/delete only on open reports
- [ ] Responsive layout

---

### Task 10: Create Expense Card Component

**Files to create:**
- `src/components/expenses/expense-card.tsx` - Individual expense display

**Component requirements:**
1. Receipt thumbnail (left side)
2. Expense details (merchant, date, category)
3. Amount prominently displayed
4. Project/billable indicators
5. Action menu (edit, delete)

**Acceptance Criteria:**
- [ ] Accessible card design
- [ ] Clear visual hierarchy
- [ ] Actions clearly labeled

---

### Task 11: Create Receipt Viewer Modal

**Files to create:**
- `src/components/expenses/receipt-viewer.tsx` - Full-size receipt modal

**Component requirements:**
1. Dialog/modal overlay
2. Full-size image display
3. Close button
4. Keyboard navigation (Escape to close)

**Acceptance Criteria:**
- [ ] Modal opens on thumbnail click
- [ ] Image loads at full resolution
- [ ] Keyboard accessible

---

### Task 12: Create Delete Expense Confirmation Dialog

**Files to create:**
- `src/components/expenses/expense-delete-dialog.tsx` - Delete confirmation

**Component requirements:**
1. Alert dialog with expense summary
2. Confirm/Cancel buttons
3. Destructive styling for confirm button

**Acceptance Criteria:**
- [ ] Prevents accidental deletion
- [ ] Shows expense being deleted

---

### Task 13: Update Report Detail Page

**Files to modify:**
- `src/app/(protected)/reports/[id]/page.tsx` - Add expense list and form

**Changes:**
1. Fetch expenses along with report
2. Replace placeholder with ExpenseList component
3. Add "Add Expense" button (only for open reports)
4. Show expense total in report summary
5. Add expense form as modal/slide-over

**Acceptance Criteria:**
- [ ] Expenses displayed on report page
- [ ] Total calculated and displayed
- [ ] Add expense button visible for open reports

---

### Task 14: Create Add Expense Page/Modal

**Files to create:**
- `src/app/(protected)/reports/[id]/expenses/new/page.tsx` - New expense page

OR integrate as modal in report detail page.

**Decision:** Use slide-over panel for better UX (stays in context).

**Acceptance Criteria:**
- [ ] User can add expense without leaving report
- [ ] Form resets after successful add
- [ ] Error handling for failures

---

### Task 15: Create Edit Expense Page/Modal

**Files to create:**
- `src/app/(protected)/reports/[id]/expenses/[expenseId]/edit/page.tsx`

OR integrate as modal with expense form in edit mode.

**Acceptance Criteria:**
- [ ] Existing values populated
- [ ] Can change all editable fields
- [ ] Receipt can be replaced

---

### Task 16: Add UI Components (shadcn/ui)

**Files to create/add:**
- `src/components/ui/dialog.tsx` - Modal dialog
- `src/components/ui/select.tsx` - Category/project dropdowns
- `src/components/ui/textarea.tsx` - Memo input
- `src/components/ui/calendar.tsx` - Date picker (if not using native)
- `src/components/ui/sheet.tsx` - Slide-over panel

**Run shadcn/ui CLI to add components:**
```bash
npx shadcn@latest add dialog select textarea sheet
```

**Acceptance Criteria:**
- [ ] All UI components installed and working
- [ ] Components match design system

---

### Task 17: Write Unit Tests

**Files to create:**
- `src/lib/validations/__tests__/expenses.test.ts` - Validation tests
- `src/components/expenses/__tests__/expense-form.test.tsx` - Form tests
- `src/components/expenses/__tests__/expense-list.test.tsx` - List tests
- `src/components/expenses/__tests__/receipt-upload.test.tsx` - Upload tests

**Test cases:**

**Validation tests:**
- Required fields (amount, date, category) enforced
- Optional fields accepted
- Billable requires project (CP5)
- Amount must be positive
- Invalid dates rejected

**Component tests:**
- Form renders all fields
- Billable checkbox visibility toggle
- Form validation errors display
- Receipt preview shows image
- Expense list renders items
- Edit/delete buttons conditional on status

**Acceptance Criteria:**
- [ ] 80% coverage on new code
- [ ] All validation rules tested
- [ ] Component interactions tested

---

### Task 18: Write Integration Tests

**Files to create:**
- `src/app/api/reports/[id]/expenses/__tests__/route.test.ts`
- `src/lib/db/queries/__tests__/expenses.test.ts`

**Test cases:**

**API route tests:**
- POST creates expense with valid data
- POST rejects missing required fields
- POST rejects non-open reports
- PUT updates expense fields
- DELETE removes expense
- GET returns expenses for report
- Auth required for all endpoints

**Query tests:**
- Create expense inserts record
- Update respects status constraint
- Delete cascade works correctly
- Authorization prevents cross-user access

**Acceptance Criteria:**
- [ ] All API routes tested
- [ ] Error conditions covered
- [ ] Database operations verified

---

## File Summary

### New Files (21)
```
src/lib/blob.ts
src/types/expenses.ts
src/lib/validations/expenses.ts
src/lib/db/queries/expenses.ts
src/app/api/upload/route.ts
src/app/api/reports/[id]/expenses/route.ts
src/app/api/reports/[id]/expenses/[expenseId]/route.ts
src/components/expenses/expense-form.tsx
src/components/expenses/expense-list.tsx
src/components/expenses/expense-card.tsx
src/components/expenses/receipt-upload.tsx
src/components/expenses/receipt-viewer.tsx
src/components/expenses/expense-delete-dialog.tsx
src/components/ui/dialog.tsx
src/components/ui/select.tsx
src/components/ui/textarea.tsx
src/components/ui/sheet.tsx
src/lib/validations/__tests__/expenses.test.ts
src/components/expenses/__tests__/expense-form.test.tsx
src/components/expenses/__tests__/expense-list.test.tsx
src/components/expenses/__tests__/receipt-upload.test.tsx
src/app/api/reports/[id]/expenses/__tests__/route.test.ts
```

### Existing Files (From Phase 7 - No Changes Needed)
```
src/lib/categories.ts - Hardcoded fallback data (already exists)
src/hooks/useCategories.ts - Categories hook (already exists)
src/hooks/useProjects.ts - Projects hook (already exists)
src/app/api/qbo/categories/route.ts - Categories API (already exists)
src/app/api/qbo/projects/route.ts - Projects API (already exists)
```

### Modified Files (3)
```
package.json - Add @vercel/blob
.env.example - Add BLOB_READ_WRITE_TOKEN
src/app/(protected)/reports/[id]/page.tsx - Add expense list/form
```

---

## Requirements Traceability

| Requirement | Acceptance Criteria | Tasks |
|-------------|---------------------|-------|
| R3.1 | Add out-of-pocket to Open report | 3, 4 |
| R3.2 | Camera capture (Phase 5) | - |
| R3.3 | Accept image uploads | 5, 9 |
| R3.9 | Edit extracted fields | 8 |
| R3.10 | Require amount, date, category | 2, 8 |
| R3.11 | Optional merchant, memo, project, billable | 2, 8 |
| R3.12 | Billable only with project | 2, 8 |
| R3.13 | Store in Vercel Blob | 1, 5 |
| R3.14 | Display receipt thumbnails | 10, 11 |
| CP4 | Required fields present | 2 |
| CP5 | Billable requires project | 2, 8 |

**Not in Phase 3 scope (deferred):**
- R3.2-R3.8: Camera capture, Claude Vision extraction (Phase 4-5)

**Now available via Phase 7 (complete):**
- R5, R6: QBO categories/projects - ✅ Use `useCategories()` and `useProjects()` hooks

---

## Correctness Properties to Verify

- **CP4**: For any expense E where E.type = "out_of_pocket": E.amount, E.date, E.category must be non-null
  - Enforced by: Zod validation schema, database constraints

- **CP5**: For any expense E where E.billable = true, E.project must be non-null
  - Enforced by: Zod validation schema, UI conditional rendering

---

## Definition of Done

- [ ] User can upload receipt image to expense
- [ ] User can fill out required fields (amount, date, category)
- [ ] User can fill out optional fields (merchant, memo, project, billable)
- [ ] Billable checkbox only appears when project selected
- [ ] User can view all expenses on a report
- [ ] User can edit expenses on open reports
- [ ] User can delete expenses on open reports
- [ ] Report shows total expense amount
- [ ] Receipt thumbnails display on expense cards
- [ ] Full receipt viewable in modal
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No ESLint errors
- [ ] Code formatted with Prettier

---

## Execution Order

Recommended implementation sequence:

1. **Foundation** (Tasks 1-2): Blob setup, types, validation
2. **Data Layer** (Tasks 3-5): Queries, API routes, upload
3. **UI Components** (Tasks 6-12, 16): Form (using existing hooks), list, modals
4. **Page Integration** (Tasks 13-15): Wire up to report detail
5. **Testing** (Tasks 17-18): Unit and integration tests

> **Note:** Task 6 integrates existing QBO hooks - no placeholder data setup needed.

---

## Notes

- **Thumbnail generation**: Phase 3 uses the uploaded image as-is for thumbnails. Proper server-side thumbnail generation can be added later or in Phase 4 with Claude Vision integration.

- **Categories/Projects**: ✅ **Phase 7 is complete.** Use `useCategories()` and `useProjects()` hooks directly. The fallback chain (QBO → Cache → Hardcoded) is already implemented. `src/lib/categories.ts` serves as the final fallback safety net.

- **Camera capture**: Deferred to Phase 5. Phase 3 focuses on file upload only.

- **AI extraction**: Deferred to Phase 4. User manually enters all fields in Phase 3.

- **Testing with real data**: Since QBO integration is available, expense forms can be tested with real category/project data from the QBO sandbox from day one.
