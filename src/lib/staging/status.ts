import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { financialDb, stagingRecords } from '@/lib/db/financial-system'
import { stagingSyncStatus } from '@/lib/db/schema'

export interface StagingLineStatus {
  expenseId: string
  sourceRecordId: string
  status: string
  statusLabel: string
}

export interface ReportFinancialStatus {
  lines: StagingLineStatus[]
  summary: string
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Submitted',
  posted: 'Posted to GL',
  matched_to_payment: 'Payment Matched',
  paid: 'Paid',
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

/**
 * Read staging_records status from the financial-system DB
 * and sync to local staging_sync_status table.
 */
export async function getReportFinancialStatus(reportId: string): Promise<ReportFinancialStatus> {
  // 1. Get local sync records for this report
  const localRecords = await db
    .select()
    .from(stagingSyncStatus)
    .where(eq(stagingSyncStatus.reportId, reportId))

  if (localRecords.length === 0) {
    return { lines: [], summary: 'Not submitted' }
  }

  // 2. If financial-system DB is available, refresh statuses
  if (financialDb) {
    try {
      const sourceRecordIds = localRecords.map((r) => r.sourceRecordId)

      // Query financial-system for current statuses
      const remoteRecords = await financialDb
        .select({
          sourceRecordId: stagingRecords.sourceRecordId,
          status: stagingRecords.status,
        })
        .from(stagingRecords)
        .where(
          and(
            eq(stagingRecords.sourceApp, 'expense_reports'),
            eq(stagingRecords.referenceId, reportId)
          )
        )

      // Update local sync records with remote status
      for (const remote of remoteRecords) {
        const local = localRecords.find((l) => l.sourceRecordId === remote.sourceRecordId)
        if (local && local.status !== remote.status) {
          await db
            .update(stagingSyncStatus)
            .set({
              status: remote.status,
              lastCheckedAt: new Date(),
            })
            .where(eq(stagingSyncStatus.id, local.id))

          local.status = remote.status
        }
      }
    } catch (error) {
      console.error('[staging/status] Failed to refresh from financial-system:', error)
      // Fall through to use cached local data
    }
  }

  // 3. Build response from local records
  const lines: StagingLineStatus[] = localRecords.map((r) => ({
    expenseId: r.expenseId,
    sourceRecordId: r.sourceRecordId,
    status: r.status,
    statusLabel: getStatusLabel(r.status),
  }))

  // 4. Build summary
  const statusCounts: Record<string, number> = {}
  for (const line of lines) {
    statusCounts[line.status] = (statusCounts[line.status] || 0) + 1
  }

  const total = lines.length
  let summary: string

  if (statusCounts['paid'] === total) {
    summary = 'All paid'
  } else if (statusCounts['posted'] === total) {
    summary = 'All posted'
  } else if (statusCounts['received'] === total) {
    summary = 'Submitted to GL'
  } else {
    const parts: string[] = []
    if (statusCounts['paid']) parts.push(`${statusCounts['paid']} paid`)
    if (statusCounts['posted']) parts.push(`${statusCounts['posted']} posted`)
    if (statusCounts['matched_to_payment']) parts.push(`${statusCounts['matched_to_payment']} matched`)
    if (statusCounts['received']) parts.push(`${statusCounts['received']} pending`)
    summary = parts.join(', ')
  }

  return { lines, summary }
}
