import { auth } from '@/lib/auth'
import { getReportById } from '@/lib/db/queries/reports'
import { getReportFinancialStatus } from '@/lib/staging/status'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify user owns the report
    const report = await getReportById(id, session.user.id)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const status = await getReportFinancialStatus(id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Failed to fetch financial status:', error)
    return NextResponse.json({ error: 'Failed to fetch financial status' }, { status: 500 })
  }
}
