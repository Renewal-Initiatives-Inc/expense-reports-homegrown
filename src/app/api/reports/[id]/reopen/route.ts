import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { reopenReport } from '@/lib/db/queries/reports'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/db/queries/audit'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const report = await reopenReport(id, session.user.id)

    await logAuditEvent(db, {
      userId: session.user.id,
      userEmail: session.user.email,
      action: AUDIT_ACTIONS.REOPENED,
      entityType: 'expense_report',
      entityId: id,
      afterState: { name: report.name, status: 'open' },
    })

    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Report not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message === 'Only rejected reports can be reopened') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    console.error('Failed to reopen report:', error)
    return NextResponse.json({ error: 'Failed to reopen report' }, { status: 500 })
  }
}
