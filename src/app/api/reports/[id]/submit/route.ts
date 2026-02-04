import { auth } from '@/lib/auth'
import { submitReport } from '@/lib/db/queries/reports'
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
