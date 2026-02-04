import { auth } from '@/lib/auth'
import { notifyReportSubmitted } from '@/lib/db/queries/notifications'
import { submitReport } from '@/lib/db/queries/reports'
import { getAdminUserIds } from '@/lib/db/queries/users'
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
    const report = await submitReport(id, session.user.id)

    // Notify all admins about the new submission
    try {
      const adminIds = await getAdminUserIds()
      if (adminIds.length > 0) {
        await notifyReportSubmitted(
          adminIds,
          report.id,
          report.name,
          session.user.name || session.user.email || 'Unknown User'
        )
      }
    } catch (notifyError) {
      // Log but don't fail the submission if notification fails
      console.error('Failed to send admin notifications:', notifyError)
    }

    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Report not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message === 'Only open reports can be submitted') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message === 'Report must have at least one expense to submit') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    console.error('Failed to submit report:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
