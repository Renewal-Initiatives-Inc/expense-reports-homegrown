# Naming Conventions

Claude: Read this before generating UI components, API routes, or tests.

---

## UI Foundations

| Property          | Value                                            |
| ----------------- | ------------------------------------------------ |
| Accessibility     | WCAG 2.1 AA / Section 508                        |
| Reference site    | renewalinitiatives.org                           |
| Component library | shadcn/ui                                        |
| Color scheme      | Light mode only                                  |
| Primary color     | #2c5530 (forest green)                           |
| Font stack        | System (-apple-system, BlinkMacSystemFont, etc.) |

---

## REQUIRED: Test IDs

All interactive elements must have `data-testid` attributes for E2E testing.

```tsx
// Pattern: {component}-{element}-{identifier?}

// Buttons
data-testid="report-submit-button"
data-testid="expense-delete-button"
data-testid="receipt-capture-button"

// Forms
data-testid="report-form"
data-testid="expense-form"
data-testid="mileage-form"

// Inputs (include field name)
data-testid="expense-amount-input"
data-testid="expense-date-input"
data-testid="mileage-origin-input"

// Lists and items
data-testid="reports-list"
data-testid="report-item-{id}"
data-testid="expenses-list"
data-testid="expense-item-{id}"

// Modals
data-testid="confirm-delete-modal"
data-testid="reject-report-modal"

// Navigation
data-testid="nav-dashboard"
data-testid="nav-reports"
data-testid="nav-admin-settings"

// Status indicators
data-testid="report-status-badge"
data-testid="notification-count"

// Email receipts feature
data-testid="expense-source-badge"
data-testid="expense-duplicate-warning"
data-testid="expense-incomplete-flag"
data-testid="secondary-email-list"
data-testid="secondary-email-add-input"
data-testid="secondary-email-add-button"
data-testid="secondary-email-remove-button-{id}"
```

---

## REQUIRED: Modal Props

```tsx
// Standard modal callback interface
interface ModalProps {
  open: boolean
  onClose: () => void // NOT: onCancel, handleClose, closeModal
  onSubmit?: () => void // NOT: onConfirm, handleSubmit, onSave
  onSuccess?: () => void // Called after successful async operation
}

// Example usage
;<ConfirmDeleteModal
  open={isDeleteModalOpen}
  onClose={() => setIsDeleteModalOpen(false)}
  onSubmit={handleDelete}
/>
```

---

## REQUIRED: Error State

```tsx
// Form-level error (single message)
const [error, setError] = useState<string | null>(null)
// NOT: errorMessage, formError, err

// Field-level errors (validation)
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
// NOT: errors, validationErrors, formErrors

// Loading state
const [isLoading, setIsLoading] = useState(false)
// NOT: loading, isSubmitting (unless specifically for form submit)

// Example pattern
{
  error && <Alert variant="destructive">{error}</Alert>
}
{
  fieldErrors.amount && <span className="text-red-500">{fieldErrors.amount}</span>
}
```

---

## REQUIRED: Date/Timestamp Fields

```tsx
// Database columns (snake_case)
created_at // NOT: createdAt, created_date
updated_at // NOT: updatedAt, updated_date
submitted_at // NOT: submittedAt, submission_date
reviewed_at // NOT: reviewedAt, review_date
expires_at // NOT: expiresAt, expiration_date

// TypeScript properties (camelCase)
createdAt // Mapped from created_at
submittedAt // Mapped from submitted_at

// User-facing date fields (no _at suffix)
date // Expense date
// NOT: expenseDate, transactionDate (unless disambiguation needed)
```

---

## Naming Patterns

| Context               | Pattern                      | Example                                       |
| --------------------- | ---------------------------- | --------------------------------------------- |
| React components      | PascalCase                   | `ExpenseCard`, `ReportList`                   |
| React hooks           | camelCase with `use` prefix  | `useExpenseForm`, `useQboCategories`          |
| API routes            | kebab-case                   | `/api/expense-reports`, `/api/qbo/categories` |
| Database tables       | snake_case                   | `expense_reports`, `qbo_cache`                |
| Database columns      | snake_case                   | `user_id`, `qbo_bill_id`                      |
| TypeScript interfaces | PascalCase                   | `ExpenseReport`, `QboCategory`                |
| TypeScript properties | camelCase                    | `userId`, `qboBillId`                         |
| Zod schemas           | camelCase with Schema suffix | `expenseSchema`, `reportSchema`               |
| Test files            | `*.test.ts(x)`               | `expense-card.test.tsx`                       |
| E2E test files        | `*.spec.ts`                  | `submit-report.spec.ts`                       |
| Constants             | SCREAMING_SNAKE_CASE         | `MAX_MILEAGE_MILES`, `IRS_RATE_KEY`           |
| Environment variables | SCREAMING_SNAKE_CASE         | `QBO_CLIENT_ID`, `ANTHROPIC_API_KEY`, `AWS_SES_FROM_ADDRESS` |

---

## Toolset-Enforced (No Action Needed)

These conventions are automatically enforced by the tooling:

| Tool        | Enforces                                     |
| ----------- | -------------------------------------------- |
| Drizzle ORM | DB columns snake_case → TS camelCase mapping |
| ESLint      | Component naming, import order               |
| Prettier    | Code formatting                              |
| TypeScript  | Type checking, interface naming              |

---

## File Structure Conventions

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Route group for authenticated pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   └── {feature}/         # Feature-specific components
├── lib/
│   ├── db/                # Drizzle schema and queries
│   ├── api/               # External API clients (QBO, Claude, Google)
│   └── utils/             # Utility functions
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions

# Email Receipts Feature Additions:
# src/app/api/email/inbound/route.ts    — webhook handler
# src/lib/email/                         — MIME parsing, sender verification, auto-reply
# src/lib/db/schema/user-emails.ts       — secondary emails table
# src/lib/db/schema/email-auto-replies.ts — rate limiting table
```

---

## Import Order

```tsx
// 1. React/Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries
import { z } from 'zod'

// 3. Internal aliases (@/)
import { Button } from '@/components/ui/button'
import { useExpenseForm } from '@/hooks/use-expense-form'

// 4. Relative imports
import { ExpenseCard } from './expense-card'
```
