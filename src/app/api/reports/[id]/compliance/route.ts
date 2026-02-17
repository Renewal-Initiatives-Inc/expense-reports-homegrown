import { auth } from '@/lib/auth'
import { getExpensesByReportId } from '@/lib/db/queries/expenses'
import { validateReportCompliance } from '@/lib/validations/compliance'
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
    const expenses = await getExpensesByReportId(id, session.user.id)
    const result = validateReportCompliance(expenses)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to check compliance:', error)
    return NextResponse.json({ error: 'Failed to check compliance' }, { status: 500 })
  }
}
