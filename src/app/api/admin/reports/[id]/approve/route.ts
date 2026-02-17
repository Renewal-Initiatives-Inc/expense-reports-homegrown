import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-utils'
import { getExpensesByReportIdAdmin } from '@/lib/db/queries/expenses'
import { notifyReportApproved } from '@/lib/db/queries/notifications'
import { approveReport, getReportByIdForAdmin } from '@/lib/db/queries/reports'
import { submitStagingRecords } from '@/lib/staging/submit'
import { approveReportSchema } from '@/lib/validations/reports'
import { db } from '@/lib/db'
import { expenseReports } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    try {
      requireAdmin(session)
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const validationResult = approveReportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten() }, { status: 422 })
    }

    // Approve the report
    const report = await approveReport(id, session.user!.id, validationResult.data.comment)

    // Submit staging records to financial system
    const expenses = await getExpensesByReportIdAdmin(id)
    const stagingResult = await submitStagingRecords(id, report.userId, expenses)

    if (!stagingResult.success) {
      // Roll back approval — revert to submitted status
      await db
        .update(expenseReports)
        .set({
          status: 'submitted',
          reviewedAt: null,
          reviewerId: null,
          reviewerComment: null,
          updatedAt: new Date(),
        })
        .where(eq(expenseReports.id, id))

      return NextResponse.json(
        {
          error: stagingResult.error || 'Failed to submit to financial system',
          stagingError: true,
        },
        { status: 422 }
      )
    }

    // Create notification for the submitter
    try {
      await notifyReportApproved(report.userId, report.id, report.name, validationResult.data.comment)
    } catch (notificationError) {
      console.error('Failed to create approval notification:', notificationError)
    }

    return NextResponse.json({
      ...report,
      stagingRecordCount: stagingResult.recordCount,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Report not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message === 'Only submitted reports can be approved') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    console.error('Failed to approve report:', error)
    return NextResponse.json({ error: 'Failed to approve report' }, { status: 500 })
  }
}
