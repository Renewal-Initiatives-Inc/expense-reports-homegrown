import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { expenses, expenseReports } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

    // Verify report exists
    const report = await db.select().from(expenseReports).where(eq(expenseReports.id, id)).limit(1)

    if (report.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Get all expenses for the report
    const reportExpenses = await db.select().from(expenses).where(eq(expenses.reportId, id)).orderBy(expenses.date)

    return NextResponse.json(reportExpenses)
  } catch (error) {
    console.error('Failed to fetch expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}
