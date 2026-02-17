import type { Expense } from '@/types/expenses'

const LODGING_GL_ACCOUNT_ID = 74
const RECEIPT_THRESHOLD_CENTS = 7500 // $75.00
const MAX_AGE_DAYS = 60
const MIN_MEMO_LENGTH = 10
const MIN_MEMO_LENGTH_NO_RECEIPT = 20

export type ViolationSeverity = 'error' | 'warning'

export interface ComplianceViolation {
  expenseId: string
  field: string
  rule: string
  message: string
  severity: ViolationSeverity
}

export interface ComplianceResult {
  valid: boolean
  violations: ComplianceViolation[]
}

/**
 * Run IRS accountable plan compliance checks on all expenses in a report.
 * Returns violations that block submission (errors) or warn (warnings).
 */
export function validateReportCompliance(expenses: Expense[]): ComplianceResult {
  const violations: ComplianceViolation[] = []
  const today = new Date()

  for (const expense of expenses) {
    const amountCents = Math.round(parseFloat(expense.amount || '0') * 100)
    const expenseDate = new Date(expense.date)
    const ageDays = Math.floor((today.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24))
    const isLodging = expense.glAccountId === LODGING_GL_ACCOUNT_ID
    const isMileage = expense.type === 'mileage'
    const hasReceipt = !!expense.receiptUrl

    // Rule 1: 60-day timeliness rule (IRS Publication 463)
    if (ageDays > MAX_AGE_DAYS) {
      violations.push({
        expenseId: expense.id,
        field: 'date',
        rule: '60_day_rule',
        message: `Expense is ${ageDays} days old (max ${MAX_AGE_DAYS} days). Under IRS accountable plan rules, expenses must be substantiated within 60 days.`,
        severity: 'error',
      })
    }

    // Rule 2: Receipt required for expenses >= $75 (except mileage)
    if (!isMileage && amountCents >= RECEIPT_THRESHOLD_CENTS && !hasReceipt) {
      violations.push({
        expenseId: expense.id,
        field: 'receiptUrl',
        rule: 'receipt_required_75',
        message: `Receipt required for expenses of $75 or more. Please attach a receipt or provide a detailed explanation (${MIN_MEMO_LENGTH_NO_RECEIPT}+ characters) in the memo.`,
        severity: 'error',
      })
    }

    // Rule 3: Lodging always requires receipt regardless of amount
    if (isLodging && !hasReceipt) {
      violations.push({
        expenseId: expense.id,
        field: 'receiptUrl',
        rule: 'lodging_receipt_required',
        message: 'Lodging expenses always require a receipt, regardless of amount.',
        severity: 'error',
      })
    }

    // Rule 4: If >= $75, no receipt, and has a memo — memo must be detailed
    if (!isMileage && amountCents >= RECEIPT_THRESHOLD_CENTS && !hasReceipt) {
      const memoLength = (expense.memo || '').trim().length
      if (memoLength > 0 && memoLength < MIN_MEMO_LENGTH_NO_RECEIPT) {
        violations.push({
          expenseId: expense.id,
          field: 'memo',
          rule: 'detailed_memo_no_receipt',
          message: `When no receipt is attached for expenses >= $75, a detailed memo of at least ${MIN_MEMO_LENGTH_NO_RECEIPT} characters is required explaining the expense.`,
          severity: 'error',
        })
      }
    }

    // Rule 5: Memo required for all expense lines
    const memoText = (expense.memo || '').trim()
    if (memoText.length === 0) {
      violations.push({
        expenseId: expense.id,
        field: 'memo',
        rule: 'memo_required',
        message: 'A business purpose memo is required for all expenses.',
        severity: 'error',
      })
    } else if (memoText.length < MIN_MEMO_LENGTH) {
      violations.push({
        expenseId: expense.id,
        field: 'memo',
        rule: 'memo_too_short',
        message: `Memo must be at least ${MIN_MEMO_LENGTH} characters describing the business purpose.`,
        severity: 'error',
      })
    }

    // Rule 6: Fund required
    if (!expense.fundId) {
      violations.push({
        expenseId: expense.id,
        field: 'fundId',
        rule: 'fund_required',
        message: 'A funding source must be selected.',
        severity: 'error',
      })
    }

    // Rule 7: GL account required for out-of-pocket expenses
    if (!isMileage && !expense.glAccountId) {
      violations.push({
        expenseId: expense.id,
        field: 'glAccountId',
        rule: 'gl_account_required',
        message: 'A GL account must be selected for out-of-pocket expenses.',
        severity: 'error',
      })
    }
  }

  return {
    valid: violations.filter((v) => v.severity === 'error').length === 0,
    violations,
  }
}
