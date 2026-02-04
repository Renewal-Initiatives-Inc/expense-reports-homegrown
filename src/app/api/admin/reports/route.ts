import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-utils'
import { getAllSubmittedReports, getRecentlyReviewedReports } from '@/lib/db/queries/reports'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await auth()

    try {
      requireAdmin(session)
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'pending'

    if (filter === 'pending') {
      const reports = await getAllSubmittedReports()
      return NextResponse.json(reports)
    } else if (filter === 'reviewed') {
      const reports = await getRecentlyReviewedReports(20)
      return NextResponse.json(reports)
    }

    return NextResponse.json({ error: 'Invalid filter parameter' }, { status: 400 })
  } catch (error) {
    console.error('Failed to fetch admin reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
