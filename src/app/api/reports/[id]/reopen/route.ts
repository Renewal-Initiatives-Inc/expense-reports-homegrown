import { auth } from '@/lib/auth'
import { reopenReport } from '@/lib/db/queries/reports'
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
