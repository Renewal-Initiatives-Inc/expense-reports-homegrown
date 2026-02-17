import { db } from '@/lib/db'
import { financialDb, stagingRecords } from '@/lib/db/financial-system'
import { stagingSyncStatus } from '@/lib/db/schema'
import type { Expense } from '@/types/expenses'

export interface StagingSubmitResult {
  success: boolean
  recordCount: number
  error?: string
}

interface StagingRow {
  sourceApp: 'expense_reports'
  sourceRecordId: string
  recordType: 'expense_line_item'
  employeeId: string
  referenceId: string
  dateIncurred: string
  amount: string
  fundId: number
  glAccountId: number | null
  metadata: Record<string, unknown>
}

/**
 * Build staging_records rows from report expenses.
 */
function buildStagingRows(
  reportId: string,
  employeeId: string,
  expenses: Expense[]
): StagingRow[] {
  return expenses.map((expense) => {
    const metadata: Record<string, unknown> =
      expense.type === 'mileage'
        ? {
            merchant: 'Mileage Reimbursement',
            memo: expense.memo || '',
            expenseType: 'mileage',
            mileageDetails: {
              miles: parseFloat(expense.miles || '0'),
              rate: 0, // Rate is baked into the amount
              origin: expense.originAddress || '',
              destination: expense.destinationAddress || '',
            },
          }
        : {
            merchant: expense.merchant || '',
            memo: expense.memo || '',
            expenseType: 'out_of_pocket',
          }

    return {
      sourceApp: 'expense_reports' as const,
      sourceRecordId: `er_${reportId}_line_${expense.id}`,
      recordType: 'expense_line_item' as const,
      employeeId,
      referenceId: reportId,
      dateIncurred: expense.date,
      amount: parseFloat(expense.amount || '0').toFixed(2),
      fundId: expense.fundId || 1,
      glAccountId: expense.glAccountId || null,
      metadata,
    }
  })
}

/**
 * Submit staging records to the financial-system database on report approval.
 *
 * - Builds one staging_record row per expense line item
 * - INSERTs all rows (idempotent via unique constraint ON CONFLICT DO NOTHING)
 * - Writes local staging_sync_status records for tracking
 *
 * If the financial-system DB is not configured, returns success with 0 records
 * (graceful degradation for development environments).
 */
export async function submitStagingRecords(
  reportId: string,
  employeeId: string,
  expenses: Expense[]
): Promise<StagingSubmitResult> {
  if (!financialDb) {
    console.warn('[staging/submit] Financial system DB not configured — skipping staging INSERT')
    return { success: true, recordCount: 0 }
  }

  if (expenses.length === 0) {
    return { success: true, recordCount: 0 }
  }

  const rows = buildStagingRows(reportId, employeeId, expenses)

  try {
    // INSERT into financial-system's staging_records
    // ON CONFLICT DO NOTHING for idempotency (re-approval after staging failure)
    const inserted = await financialDb
      .insert(stagingRecords)
      .values(rows)
      .onConflictDoNothing({ target: [stagingRecords.sourceApp, stagingRecords.sourceRecordId] })
      .returning({ id: stagingRecords.id, sourceRecordId: stagingRecords.sourceRecordId })

    // Write local sync status records
    const syncRows = expenses.map((expense) => ({
      reportId,
      expenseId: expense.id,
      sourceRecordId: `er_${reportId}_line_${expense.id}`,
      fundId: expense.fundId || 1,
      glAccountId: expense.glAccountId || 0,
      amount: parseFloat(expense.amount || '0').toFixed(2),
      status: 'received',
    }))

    // Upsert local sync status (in case of re-approval)
    for (const row of syncRows) {
      await db
        .insert(stagingSyncStatus)
        .values(row)
        .onConflictDoNothing()
    }

    return { success: true, recordCount: inserted.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Check for FK constraint violations
    if (message.includes('fund_id') || message.includes('fk_fund')) {
      return {
        success: false,
        recordCount: 0,
        error: 'One or more funding sources no longer exist in the financial system. Please edit the expenses and select valid funding sources.',
      }
    }
    if (message.includes('gl_account_id') || message.includes('fk_account')) {
      return {
        success: false,
        recordCount: 0,
        error: 'One or more GL accounts no longer exist in the financial system. Please edit the expenses and select valid GL accounts.',
      }
    }

    console.error('[staging/submit] Failed to insert staging records:', error)
    return {
      success: false,
      recordCount: 0,
      error: `Failed to submit to financial system: ${message}`,
    }
  }
}
