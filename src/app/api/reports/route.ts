import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createReport, getReportsByUserId } from '@/lib/db/queries/reports'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/db/queries/audit'
import { createReportSchema } from '@/lib/validations/reports'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reports = await getReportsByUserId(session.user.id)

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createReportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten() }, { status: 422 })
    }

    const report = await createReport(session.user.id, validationResult.data)

    await logAuditEvent(db, {
      userId: session.user.id,
      userEmail: session.user.email,
      action: AUDIT_ACTIONS.CREATED,
      entityType: 'expense_report',
      entityId: report.id,
      afterState: { name: report.name, status: report.status },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Failed to create report:', error)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}
