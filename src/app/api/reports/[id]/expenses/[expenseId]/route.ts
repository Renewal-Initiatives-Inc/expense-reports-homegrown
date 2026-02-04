import { auth } from '@/lib/auth'
import { deleteExpense, getExpenseById, updateExpense } from '@/lib/db/queries/expenses'
import { updateExpenseSchema } from '@/lib/validations/expenses'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; expenseId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { expenseId } = await params
    const expense = await getExpenseById(expenseId, session.user.id)

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Failed to fetch expense:', error)
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { expenseId } = await params
    const body = await request.json()
    const validationResult = updateExpenseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.error.flatten() }, { status: 422 })
    }

    const data = validationResult.data

    // Map validated data to UpdateExpenseInput format
    const updateInput: Record<string, unknown> = {}

    if (data.date !== undefined) updateInput.date = data.date
    if (data.memo !== undefined) updateInput.memo = data.memo
    if (data.projectId !== undefined) updateInput.projectId = data.projectId
    if (data.projectName !== undefined) updateInput.projectName = data.projectName
    if (data.billable !== undefined) updateInput.billable = data.billable

    if (data.type === 'out_of_pocket') {
      if (data.amount !== undefined) updateInput.amount = data.amount
      if (data.merchant !== undefined) updateInput.merchant = data.merchant
      if (data.categoryId !== undefined) updateInput.categoryId = data.categoryId
      if (data.categoryName !== undefined) updateInput.categoryName = data.categoryName
      if (data.receiptUrl !== undefined) updateInput.receiptUrl = data.receiptUrl
      if (data.receiptThumbnailUrl !== undefined) updateInput.receiptThumbnailUrl = data.receiptThumbnailUrl
      if (data.aiConfidence !== undefined) updateInput.aiConfidence = data.aiConfidence
    } else if (data.type === 'mileage') {
      if (data.amount !== undefined) updateInput.amount = data.amount.toFixed(2)
      if (data.originAddress !== undefined) updateInput.originAddress = data.originAddress
      if (data.destinationAddress !== undefined) updateInput.destinationAddress = data.destinationAddress
      if (data.miles !== undefined) updateInput.miles = data.miles.toFixed(2)
    }

    const expense = await updateExpense(expenseId, session.user.id, updateInput)

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    if (error instanceof Error && error.message === 'Only open reports can be modified') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Failed to update expense:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { expenseId } = await params
    const deleted = await deleteExpense(expenseId, session.user.id)

    if (!deleted) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Only open reports can be modified') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Failed to delete expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
