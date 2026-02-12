import { and, eq, sql, sum } from 'drizzle-orm'
import { db } from '..'
import { expenses, expenseReports } from '../schema'
import type { CreateExpenseInput, Expense, ExpenseType, UpdateExpenseInput } from '@/types/expenses'

/**
 * Get all expenses for a report, with authorization check.
 */
export async function getExpensesByReportId(reportId: string, userId: string): Promise<Expense[]> {
  // Verify user owns the report
  const report = await db
    .select()
    .from(expenseReports)
    .where(and(eq(expenseReports.id, reportId), eq(expenseReports.userId, userId)))
    .limit(1)

  if (report.length === 0) {
    return []
  }

  const results = await db.select().from(expenses).where(eq(expenses.reportId, reportId)).orderBy(expenses.date)

  return results.map(mapExpenseRow)
}

/**
 * Get a single expense by ID with authorization check.
 */
export async function getExpenseById(id: string, userId: string): Promise<Expense | null> {
  const results = await db
    .select({
      expense: expenses,
      reportUserId: expenseReports.userId,
    })
    .from(expenses)
    .innerJoin(expenseReports, eq(expenses.reportId, expenseReports.id))
    .where(and(eq(expenses.id, id), eq(expenseReports.userId, userId)))
    .limit(1)

  if (results.length === 0) {
    return null
  }

  return mapExpenseRow(results[0].expense)
}

/**
 * Create a new expense on a report.
 * Checks that report is owned by user and is open.
 */
export async function createExpense(
  reportId: string,
  userId: string,
  input: CreateExpenseInput
): Promise<Expense | null> {
  // Verify user owns the report and it's open
  const report = await db
    .select()
    .from(expenseReports)
    .where(and(eq(expenseReports.id, reportId), eq(expenseReports.userId, userId)))
    .limit(1)

  if (report.length === 0) {
    return null
  }

  if (report[0].status !== 'open') {
    throw new Error('Only open reports can be modified')
  }

  const results = await db
    .insert(expenses)
    .values({
      reportId,
      type: input.type,
      amount: input.amount,
      date: input.date,
      merchant: input.merchant || null,
      memo: input.memo || null,
      categoryId: input.categoryId || null,
      categoryName: input.categoryName || null,
      projectId: input.projectId || null,
      projectName: input.projectName || null,
      billable: input.billable || false,
      receiptUrl: input.receiptUrl || null,
      receiptThumbnailUrl: input.receiptThumbnailUrl || null,
      // Mileage-specific fields
      originAddress: input.originAddress || null,
      destinationAddress: input.destinationAddress || null,
      miles: input.miles || null,
      // AI confidence for receipt extraction
      aiConfidence: input.aiConfidence || null,
    })
    .returning()

  // Update report timestamp
  await db.update(expenseReports).set({ updatedAt: new Date() }).where(eq(expenseReports.id, reportId))

  return mapExpenseRow(results[0])
}

/**
 * Update an existing expense.
 * Checks that report is owned by user and is open.
 */
export async function updateExpense(id: string, userId: string, input: UpdateExpenseInput): Promise<Expense | null> {
  // Verify expense exists and user owns the report
  const existing = await db
    .select({
      expense: expenses,
      reportUserId: expenseReports.userId,
      reportStatus: expenseReports.status,
    })
    .from(expenses)
    .innerJoin(expenseReports, eq(expenses.reportId, expenseReports.id))
    .where(and(eq(expenses.id, id), eq(expenseReports.userId, userId)))
    .limit(1)

  if (existing.length === 0) {
    return null
  }

  if (existing[0].reportStatus !== 'open') {
    throw new Error('Only open reports can be modified')
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (input.amount !== undefined) updateData.amount = input.amount
  if (input.date !== undefined) updateData.date = input.date
  if (input.merchant !== undefined) updateData.merchant = input.merchant
  if (input.memo !== undefined) updateData.memo = input.memo
  if (input.categoryId !== undefined) updateData.categoryId = input.categoryId
  if (input.categoryName !== undefined) updateData.categoryName = input.categoryName
  if (input.projectId !== undefined) updateData.projectId = input.projectId
  if (input.projectName !== undefined) updateData.projectName = input.projectName
  if (input.billable !== undefined) updateData.billable = input.billable
  if (input.receiptUrl !== undefined) updateData.receiptUrl = input.receiptUrl
  if (input.receiptThumbnailUrl !== undefined) updateData.receiptThumbnailUrl = input.receiptThumbnailUrl
  // Mileage-specific fields
  if (input.originAddress !== undefined) updateData.originAddress = input.originAddress
  if (input.destinationAddress !== undefined) updateData.destinationAddress = input.destinationAddress
  if (input.miles !== undefined) updateData.miles = input.miles
  // AI confidence for receipt extraction
  if (input.aiConfidence !== undefined) updateData.aiConfidence = input.aiConfidence

  const results = await db.update(expenses).set(updateData).where(eq(expenses.id, id)).returning()

  // Update report timestamp
  await db
    .update(expenseReports)
    .set({ updatedAt: new Date() })
    .where(eq(expenseReports.id, existing[0].expense.reportId))

  return mapExpenseRow(results[0])
}

/**
 * Delete an expense.
 * Checks that report is owned by user and is open.
 */
export async function deleteExpense(id: string, userId: string): Promise<boolean> {
  // Verify expense exists and user owns the report
  const existing = await db
    .select({
      expense: expenses,
      reportUserId: expenseReports.userId,
      reportStatus: expenseReports.status,
    })
    .from(expenses)
    .innerJoin(expenseReports, eq(expenses.reportId, expenseReports.id))
    .where(and(eq(expenses.id, id), eq(expenseReports.userId, userId)))
    .limit(1)

  if (existing.length === 0) {
    return false
  }

  if (existing[0].reportStatus !== 'open') {
    throw new Error('Only open reports can be modified')
  }

  const result = await db.delete(expenses).where(eq(expenses.id, id)).returning()

  if (result.length > 0) {
    // Update report timestamp
    await db
      .update(expenseReports)
      .set({ updatedAt: new Date() })
      .where(eq(expenseReports.id, existing[0].expense.reportId))
  }

  return result.length > 0
}

/**
 * Get the total amount for a report.
 */
export async function getReportTotal(reportId: string): Promise<string> {
  const result = await db
    .select({
      total: sql<string>`COALESCE(${sum(expenses.amount)}, '0')`,
    })
    .from(expenses)
    .where(eq(expenses.reportId, reportId))

  return result[0]?.total || '0'
}

/**
 * Map database row to Expense type.
 */
function mapExpenseRow(row: typeof expenses.$inferSelect): Expense {
  return {
    id: row.id,
    reportId: row.reportId,
    type: row.type as ExpenseType,
    amount: row.amount,
    date: row.date,
    merchant: row.merchant,
    memo: row.memo,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    projectId: row.projectId,
    projectName: row.projectName,
    billable: row.billable ?? false,
    receiptUrl: row.receiptUrl,
    receiptThumbnailUrl: row.receiptThumbnailUrl,
    originAddress: row.originAddress,
    destinationAddress: row.destinationAddress,
    miles: row.miles,
    aiConfidence: row.aiConfidence as Record<string, number> | null,
    source: (row.source as 'camera' | 'email') ?? 'camera',
    emailReceivedAt: row.emailReceivedAt,
    emailMessageId: row.emailMessageId,
    duplicateFlag: row.duplicateFlag ?? false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
