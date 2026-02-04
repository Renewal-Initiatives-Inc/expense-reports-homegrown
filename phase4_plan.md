# Phase 4: Receipt Processing with Claude Vision - Execution Plan

> **Goal**: Automatically extract receipt data using Claude Vision API and display with confidence indicators.

## Phase Dependencies

**Prerequisites from Phase 3** (verified complete):
- [x] Receipt upload working via Vercel Blob (`/api/upload`)
- [x] Receipt images stored and accessible via public URLs
- [x] `ReceiptUpload` component functional with drag-drop and file selection
- [x] `ExpenseForm` component ready for enhancement
- [x] Database schema has `aiConfidence` JSONB field ready for use
- [x] Type system includes `aiConfidence: Record<string, number> | null`

---

## Implementation Tasks

### Task 1: Install Anthropic SDK and Configure Environment

**Files to modify:**
- `package.json` - Add `@anthropic-ai/sdk` dependency
- `.env.local` - Add `ANTHROPIC_API_KEY` (user must configure)
- `.env.example` - Document the required variable (if not already)

**Implementation:**
```bash
npm install @anthropic-ai/sdk
```

**Environment variable:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

**Acceptance criteria:**
- Anthropic SDK installed and importable
- Environment variable documented and configured locally

---

### Task 2: Create Anthropic Client Library

**File to create:** `src/lib/anthropic.ts`

**Purpose:** Centralized Anthropic API client with configuration

**Implementation details:**
```typescript
// Key exports:
// - createAnthropicClient(): Anthropic client instance
// - RECEIPT_MODEL: Model to use (claude-sonnet-4-20250514 for vision)
// - Error handling utilities
```

**Key considerations:**
- Use server-side only (no client bundle)
- Handle missing API key gracefully
- Export constants for model selection

**Acceptance criteria:**
- Client initializes successfully with API key
- Clear error when API key missing
- Works in API routes (server-side only)

---

### Task 3: Create Receipt Processing API Route

**File to create:** `src/app/api/receipts/process/route.ts`

**Endpoint:** `POST /api/receipts/process`

**Request body:**
```typescript
{
  receiptUrl: string   // Vercel Blob URL of uploaded receipt
  categories: Array<{  // Available QBO categories for suggestion
    id: string
    name: string
  }>
}
```

**Response body:**
```typescript
{
  success: true
  data: {
    merchant: string | null
    amount: string | null      // Formatted as decimal string "12.50"
    date: string | null        // Formatted as YYYY-MM-DD
    suggestedCategoryId: string | null
    suggestedCategoryName: string | null
    memo: string | null        // Any other text/notes extracted
    confidence: {
      merchant: number         // 0.0 - 1.0
      amount: number
      date: number
      category: number
    }
  }
}
// OR on error:
{
  success: false
  error: string
  code: 'UNREADABLE' | 'TIMEOUT' | 'API_ERROR' | 'VALIDATION_ERROR'
}
```

**Implementation details:**
1. Validate request body (receiptUrl required)
2. Fetch image from Vercel Blob URL
3. Send to Claude Vision with extraction prompt
4. Parse structured response
5. Match extracted category to available categories
6. Return normalized data with confidence scores

**Timeout handling:**
- Use `AbortController` with 30-second timeout
- Return `TIMEOUT` error code if exceeded

**Acceptance criteria:**
- R13.1: Sends receipt images to Claude Vision API
- R13.2: Extracts merchant name, total amount, transaction date
- R13.3: Suggests expense category from available categories
- R13.4: Returns confidence scores for each field
- R13.8: Handles timeout after 30 seconds

---

### Task 4: Build Claude Vision Prompt for Receipt Extraction

**File to modify:** `src/lib/anthropic.ts` (or new `src/lib/receipt-extraction.ts`)

**Prompt design requirements:**
- Extract: merchant name, total amount, date
- Handle various receipt formats (retail, restaurant, gas station, etc.)
- Return confidence scores (high/medium/low mapped to 0.0-1.0)
- Identify category based on merchant type and items
- Handle receipts with multiple totals (tax, subtotal, grand total)
- Handle partial/unclear receipts gracefully

**Prompt structure:**
```typescript
const RECEIPT_EXTRACTION_PROMPT = `
Analyze this receipt image and extract the following information.
Return your response as JSON with these fields:

{
  "merchant": {
    "value": "store/restaurant name",
    "confidence": "high" | "medium" | "low"
  },
  "amount": {
    "value": "total amount as number (e.g., 42.50)",
    "confidence": "high" | "medium" | "low"
  },
  "date": {
    "value": "YYYY-MM-DD format",
    "confidence": "high" | "medium" | "low"
  },
  "category_hint": {
    "value": "type of expense (e.g., Meals, Office Supplies, Travel)",
    "confidence": "high" | "medium" | "low"
  },
  "notes": "any other relevant information from the receipt"
}

Guidelines:
- For amount, use the grand total/final amount, not subtotals
- If date format is unclear, use your best interpretation
- For confidence:
  - "high": clearly visible and unambiguous
  - "medium": partially visible or requires interpretation
  - "low": guessing or very unclear
- If a field cannot be determined, use null for value and "low" for confidence
`
```

**Confidence mapping:**
- "high" → 0.95
- "medium" → 0.75
- "low" → 0.45

**Acceptance criteria:**
- Prompt handles variety of receipt formats
- Returns structured JSON response
- Confidence levels are meaningful and consistent

---

### Task 5: Implement Category Suggestion Logic

**File to modify:** `src/app/api/receipts/process/route.ts`

**Logic:**
1. Receive `category_hint` from Claude (e.g., "Meals", "Office Supplies")
2. Match against available QBO categories using fuzzy matching:
   - Exact match (case-insensitive)
   - Contains match
   - Common synonyms mapping
3. Return matched category with adjusted confidence

**Synonym mapping:**
```typescript
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'meals': ['food', 'restaurant', 'dining', 'lunch', 'dinner', 'breakfast'],
  'travel': ['transportation', 'flight', 'hotel', 'lodging'],
  'office supplies': ['supplies', 'stationery', 'office'],
  'software': ['subscription', 'saas', 'technology'],
  // ... extend as needed
}
```

**Acceptance criteria:**
- R3.6: Suggests expense category based on receipt content
- R13.3: Suggests category from available QBO categories
- Category matching works for common expense types

---

### Task 6: Create Receipt Processing Hook

**File to create:** `src/hooks/use-receipt-processing.ts`

**Purpose:** Client-side hook for triggering and tracking receipt processing

**Interface:**
```typescript
interface UseReceiptProcessingResult {
  processReceipt: (receiptUrl: string) => Promise<void>
  isProcessing: boolean
  result: ReceiptExtractionResult | null
  error: string | null
  reset: () => void
}
```

**Implementation details:**
- Fetch categories from existing `useCategories` hook
- POST to `/api/receipts/process`
- Handle loading, success, and error states
- Provide reset function for retry

**Acceptance criteria:**
- Clean interface for components to trigger processing
- Handles all processing states
- Supports retry via reset

---

### Task 7: Update ExpenseForm with AI Extraction Display

**File to modify:** `src/components/expenses/expense-form.tsx`

**New features:**
1. "Process Receipt" button after upload (or auto-process option)
2. Display extracted values in form fields
3. Show confidence indicators next to AI-filled fields
4. Visual distinction for AI-populated vs user-entered values
5. Allow editing all fields (AI values are suggestions only)

**UI changes:**
```tsx
// After ReceiptUpload, add processing section:
{receiptUrl && (
  <div className="flex items-center gap-2">
    <Button
      type="button"
      variant="outline"
      onClick={handleProcessReceipt}
      disabled={isProcessing}
    >
      {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {isProcessing ? 'Processing...' : 'Extract from Receipt'}
    </Button>
    {extractionResult && (
      <span className="text-sm text-muted-foreground">
        Data extracted - review and edit as needed
      </span>
    )}
  </div>
)}

// For each field, add confidence indicator:
<div className="space-y-2">
  <Label htmlFor="amount">
    Amount <span className="text-destructive">*</span>
    {aiConfidence?.amount && (
      <ConfidenceIndicator confidence={aiConfidence.amount} />
    )}
  </Label>
  {/* ... existing input ... */}
</div>
```

**Acceptance criteria:**
- R3.9: Allows users to edit all extracted fields before saving
- R13.6: Handles unreadable receipts gracefully
- Process button visible after receipt upload
- Fields populate with extracted data
- User can edit all AI-suggested values

---

### Task 8: Create Confidence Indicator Component

**File to create:** `src/components/ui/confidence-indicator.tsx`

**Purpose:** Visual indicator of AI extraction confidence

**Design:**
```typescript
interface ConfidenceIndicatorProps {
  confidence: number  // 0.0 - 1.0
  showLabel?: boolean
}

// Visual representation:
// - High (>=0.9): Green dot/checkmark, "High confidence"
// - Medium (0.7-0.89): Yellow/amber dot, "Medium confidence"
// - Low (<0.7): Red dot/warning, "Low confidence - please verify"
```

**Implementation:**
```tsx
export function ConfidenceIndicator({ confidence, showLabel = false }: Props) {
  const level = confidence >= 0.9 ? 'high' : confidence >= 0.7 ? 'medium' : 'low'

  const colors = {
    high: 'bg-green-500',
    medium: 'bg-yellow-500',
    low: 'bg-red-500'
  }

  const labels = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence - verify'
  }

  return (
    <span className="inline-flex items-center gap-1 ml-2" title={labels[level]}>
      <span className={`h-2 w-2 rounded-full ${colors[level]}`} />
      {showLabel && <span className="text-xs text-muted-foreground">{labels[level]}</span>}
    </span>
  )
}
```

**Acceptance criteria:**
- R3.7: Displays confidence indicators for AI-extracted fields
- R3.8: Shows low confidence warnings for uncertain extractions
- R13.5: Flags low-confidence extractions with visual indicator
- Clear visual distinction between confidence levels
- Accessible with title/tooltip

---

### Task 9: Implement Low Confidence Warning Banner

**File to modify:** `src/components/expenses/expense-form.tsx`

**Purpose:** Show prominent warning when any field has low confidence

**Implementation:**
```tsx
{hasLowConfidenceFields && (
  <Alert variant="warning" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Review Required</AlertTitle>
    <AlertDescription>
      Some fields were extracted with low confidence. Please verify the
      highlighted values are correct before saving.
    </AlertDescription>
  </Alert>
)}
```

**Logic:**
- Check if any field in `aiConfidence` is below 0.7
- Show warning banner at top of form
- Highlight specific low-confidence fields

**Acceptance criteria:**
- R3.8: Shows low confidence warnings
- R13.5: Flags low-confidence extractions
- Warning is prominent but not blocking
- User understands which fields need attention

---

### Task 10: Handle Unreadable Receipts Gracefully

**File to modify:** `src/components/expenses/expense-form.tsx`

**Scenarios:**
1. Image is blurry/unclear - partial extraction with low confidence
2. Not a receipt - return error with helpful message
3. Processing fails - show retry option

**Error handling UI:**
```tsx
{extractionError && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Couldn't read receipt</AlertTitle>
    <AlertDescription>
      {extractionError === 'UNREADABLE'
        ? "The receipt image couldn't be processed. You can enter the details manually below."
        : extractionError === 'TIMEOUT'
        ? "Processing took too long. Please try again or enter details manually."
        : "An error occurred. Please try again or enter details manually."}
    </AlertDescription>
    <Button variant="outline" size="sm" onClick={handleRetry}>
      Try Again
    </Button>
  </Alert>
)}
```

**Acceptance criteria:**
- R13.6: Handles unreadable receipts gracefully
- R13.7: Processes receipts asynchronously (non-blocking)
- User can continue with manual entry
- Retry option available
- Error messages are helpful, not technical

---

### Task 11: Implement 30-Second Timeout

**File to modify:** `src/app/api/receipts/process/route.ts`

**Implementation:**
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30000)

try {
  const response = await anthropic.messages.create({
    // ... config
  }, {
    signal: controller.signal
  })
  // ... handle response
} catch (error) {
  if (error.name === 'AbortError') {
    return NextResponse.json({
      success: false,
      error: 'Processing timed out. Please try again.',
      code: 'TIMEOUT'
    }, { status: 408 })
  }
  // ... handle other errors
} finally {
  clearTimeout(timeout)
}
```

**Acceptance criteria:**
- R13.8: Timeout after 30 seconds
- Clean abort without hanging
- User gets clear timeout message
- Can retry after timeout

---

### Task 12: Add Loading State During Processing

**File to modify:** `src/components/expenses/expense-form.tsx`

**Loading UX:**
1. "Process Receipt" button shows spinner
2. Form fields disabled during processing (or show skeleton)
3. Progress indicator or processing message
4. Cancel option for long-running process

**Implementation:**
```tsx
{isProcessing && (
  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Analyzing receipt...</p>
      <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
    </div>
  </div>
)}
```

**Acceptance criteria:**
- R13.7: Processes asynchronously (non-blocking UI)
- Clear indication processing is happening
- User knows to wait
- Form doesn't feel frozen

---

### Task 13: Store AI Confidence in Expense Record

**Files to modify:**
- `src/app/api/reports/[id]/expenses/route.ts` - Accept aiConfidence on create
- `src/app/api/reports/[id]/expenses/[expenseId]/route.ts` - Accept on update
- `src/lib/validations/expenses.ts` - Add aiConfidence to schema

**Database field already exists:** `aiConfidence` (JSONB)

**Payload update:**
```typescript
// Add to CreateExpenseInput
aiConfidence?: {
  merchant?: number
  amount?: number
  date?: number
  category?: number
}
```

**Acceptance criteria:**
- Confidence scores saved with expense
- Can be retrieved and displayed later
- Doesn't break existing expense creation

---

## Tests to Write

### Unit Tests

**File to create:** `src/lib/__tests__/anthropic.test.ts`
- Test client initialization with/without API key
- Test error handling for missing key

**File to create:** `src/lib/__tests__/receipt-extraction.test.ts`
- Test confidence level mapping (high/medium/low to numbers)
- Test category matching logic
- Test response parsing from Claude

**File to create:** `src/components/ui/__tests__/confidence-indicator.test.tsx`
- Test renders correct color for each level
- Test accessibility (title attribute)
- Test label visibility toggle

### Integration Tests

**File to create:** `src/app/api/receipts/__tests__/process.test.ts`
- Mock Anthropic API responses
- Test successful extraction
- Test timeout handling
- Test unreadable receipt handling
- Test validation errors

### Component Tests

**File to create:** `src/components/expenses/__tests__/expense-form-ai.test.tsx`
- Test process receipt button appears after upload
- Test form fields populate from extraction
- Test confidence indicators display
- Test low confidence warning shows
- Test user can edit AI values
- Test error states display correctly

---

## Acceptance Criteria Mapping

| Requirement | Acceptance Criteria | Task(s) |
|-------------|---------------------|---------|
| R3.4 | Send receipt images to Claude Vision API | Task 3 |
| R3.5 | Extract merchant name, total amount, date | Task 3, 4 |
| R3.6 | Suggest expense category | Task 5 |
| R3.7 | Display confidence indicators | Task 8 |
| R3.8 | Show low confidence warnings | Task 8, 9 |
| R3.9 | Allow editing extracted fields | Task 7 |
| R13.1 | Send to Claude Vision API | Task 3 |
| R13.2 | Extract merchant, amount, date | Task 4 |
| R13.3 | Suggest category from QBO | Task 5 |
| R13.4 | Return confidence scores | Task 3, 4 |
| R13.5 | Flag low-confidence extractions | Task 8, 9 |
| R13.6 | Handle unreadable receipts | Task 10 |
| R13.7 | Process asynchronously | Task 6, 12 |
| R13.8 | Timeout after 30 seconds | Task 11 |

---

## Correctness Properties Validated

| Property | Description | How Validated |
|----------|-------------|---------------|
| CP4 | Required fields present | User must confirm/edit before save |
| CP5 | Billable requires project | Existing validation unchanged |
| CP9 | Category from QBO | Suggested category comes from QBO list |

---

## Implementation Order

1. **Task 1**: Install SDK and configure environment
2. **Task 2**: Create Anthropic client library
3. **Task 4**: Build extraction prompt (can test in isolation)
4. **Task 5**: Category suggestion logic
5. **Task 3**: Create API route (combines 2, 4, 5)
6. **Task 11**: Add timeout handling to API route
7. **Task 8**: Create confidence indicator component
8. **Task 6**: Create receipt processing hook
9. **Task 7**: Update ExpenseForm with AI extraction
10. **Task 9**: Add low confidence warning
11. **Task 10**: Handle unreadable receipts
12. **Task 12**: Loading states
13. **Task 13**: Store confidence in database
14. **Write tests** throughout

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Claude Vision accuracy varies | Always show confidence; allow manual edit |
| API costs | Vision API is per-image; ~8 users monthly = minimal cost |
| Timeout issues | 30s timeout with clear user feedback |
| Category mismatch | Fuzzy matching + low confidence when unsure |

---

## Deliverable

When Phase 4 is complete:
- User uploads receipt image
- Clicks "Extract from Receipt" button
- System sends to Claude Vision API
- Form auto-fills with extracted data
- Confidence indicators show reliability
- Low confidence fields are highlighted
- User can edit any field
- Saves expense with AI confidence metadata

---

## Notes

- The `aiConfidence` database field already exists from Phase 3 preparation
- No camera capture in this phase (that's Phase 5)
- This phase focuses on file upload -> AI extraction -> form population
- All AI suggestions are editable; user has final say
