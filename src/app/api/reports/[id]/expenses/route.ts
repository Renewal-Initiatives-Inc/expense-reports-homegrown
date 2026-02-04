import { auth } from '@/lib/auth'
import { createExpense, getExpensesByReportId } from '@/lib/db/queries/expenses'
import { createMileageExpenseSchema, createOutOfPocketExpenseSchema } from '@/lib/validations/expenses'
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

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Failed to fetch expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Determine which schema to use based on expense type
    let validationResult
    if (body.type === 'mileage') {
      validationResult = createMileageExpenseSchema.safeParse(body)
    } else if (body.type === 'out_of_pocket') {
      validationResult = createOutOfPocketExpenseSchema.safeParse(body)
    } else {
      return NextResponse.json({ error: 'Invalid expense type' }, { status: 422 })
    }

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten() }, { status: 422 })
    }

    const data = validationResult.data

    // Map validated data to CreateExpenseInput format based on type
    let expenseInput
    if (data.type === 'mileage') {
      expenseInput = {
        type: data.type,
        amount: data.amount.toFixed(2),
        date: data.date,
        memo: data.memo,
        projectId: data.projectId,
        projectName: data.projectName,
        billable: data.billable,
        originAddress: data.originAddress,
        destinationAddress: data.destinationAddress,
        miles: data.miles.toFixed(2),
      }
    } else {
      expenseInput = {
        type: data.type,
        amount: data.amount,
        date: data.date,
        merchant: data.merchant,
        memo: data.memo,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        projectId: data.projectId,
        projectName: data.projectName,
        billable: data.billable,
        receiptUrl: data.receiptUrl,
        receiptThumbnailUrl: data.receiptThumbnailUrl,
        aiConfidence: data.aiConfidence,
      }
    }

    const expense = await createExpense(id, session.user.id, expenseInput)

    if (!expense) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Only open reports can be modified') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Failed to create expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
