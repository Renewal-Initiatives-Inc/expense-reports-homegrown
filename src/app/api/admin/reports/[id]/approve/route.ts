import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-utils'
import { notifyReportApproved } from '@/lib/db/queries/notifications'
import { approveReport } from '@/lib/db/queries/reports'
import { approveReportSchema } from '@/lib/validations/reports'
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

    const report = await approveReport(id, session.user!.id, validationResult.data.comment)

    // Create notification for the submitter
    try {
      await notifyReportApproved(report.userId, report.id, report.name, validationResult.data.comment)
    } catch (notificationError) {
      console.error('Failed to create approval notification:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(report)
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
