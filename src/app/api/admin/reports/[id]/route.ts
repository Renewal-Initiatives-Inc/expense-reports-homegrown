import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-utils'
import { getReportByIdForReview } from '@/lib/db/queries/reports'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    try {
      requireAdmin(session)
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const report = await getReportByIdForReview(id)

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to fetch report:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
