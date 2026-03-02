import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/db/queries/audit'
import { notifyReportRejected } from '@/lib/db/queries/notifications'
import { rejectReport } from '@/lib/db/queries/reports'
import { rejectReportSchema } from '@/lib/validations/reports'
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
    const body = await request.json()
    const validationResult = rejectReportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten() }, { status: 422 })
    }

    const report = await rejectReport(id, session.user!.id, validationResult.data.comment)

    await logAuditEvent(db, {
      userId: session.user!.id,
      userEmail: session.user!.email,
      action: AUDIT_ACTIONS.REJECTED,
      entityType: 'expense_report',
      entityId: id,
      afterState: { name: report.name, status: 'rejected', reviewerId: session.user!.id, comment: validationResult.data.comment },
    })

    // Create notification for the submitter
    try {
      await notifyReportRejected(report.userId, report.id, report.name, validationResult.data.comment)
    } catch (notificationError) {
      console.error('Failed to create rejection notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Report not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message === 'Only submitted reports can be rejected') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    console.error('Failed to reject report:', error)
    return NextResponse.json({ error: 'Failed to reject report' }, { status: 500 })
  }
}
