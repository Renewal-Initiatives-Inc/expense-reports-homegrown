import { and, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '..'
import { expenses, expenseReports, type ReportStatus } from '../schema'
import type { CreateReportInput, ExpenseReport, ExpenseReportSummary, ReportCountsByStatus, UpdateReportInput } from '@/types/reports'

function formatDefaultReportName(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `Report ${year}-${month}-${day}`
}

export async function getReportsByUserId(userId: string): Promise<ExpenseReportSummary[]> {
  const results = await db
    .select({
      id: expenseReports.id,
      userId: expenseReports.userId,
      name: expenseReports.name,
      status: expenseReports.status,
      createdAt: expenseReports.createdAt,
      updatedAt: expenseReports.updatedAt,
      expenseCount: sql<number>`COALESCE(count(${expenses.id}), 0)::int`,
      totalAmount: sql<string | null>`COALESCE(sum(${expenses.amount}), 0)::numeric(10,2)`,
    })
    .from(expenseReports)
    .leftJoin(expenses, eq(expenses.reportId, expenseReports.id))
    .where(eq(expenseReports.userId, userId))
    .groupBy(expenseReports.id)
    .orderBy(desc(expenseReports.createdAt))

  return results.map((row) => ({
    ...row,
    status: row.status as ReportStatus,
  }))
}

export async function getReportById(id: string, userId: string): Promise<ExpenseReport | null> {
  const results = await db.select().from(expenseReports).where(and(eq(expenseReports.id, id), eq(expenseReports.userId, userId))).limit(1)

  if (results.length === 0) {
    return null
  }

  const row = results[0]
  return {
    ...row,
    status: row.status as ReportStatus,
  }
}

export async function getReportByIdForAdmin(id: string): Promise<ExpenseReport | null> {
  const results = await db.select().from(expenseReports).where(eq(expenseReports.id, id)).limit(1)

  if (results.length === 0) {
    return null
  }

  const row = results[0]
  return {
    ...row,
    status: row.status as ReportStatus,
  }
}

export async function createReport(userId: string, input: CreateReportInput): Promise<ExpenseReport> {
  const name = input.name?.trim() || formatDefaultReportName()

  const results = await db
    .insert(expenseReports)
    .values({
      userId,
      name,
      status: 'open',
    })
    .returning()

  const row = results[0]
  return {
    ...row,
    status: row.status as ReportStatus,
  }
}

export async function updateReport(id: string, userId: string, input: UpdateReportInput): Promise<ExpenseReport | null> {
  const existing = await getReportById(id, userId)

  if (!existing) {
    return null
  }

  if (existing.status !== 'open') {
    throw new Error('Only open reports can be edited')
  }

  const results = await db
    .update(expenseReports)
    .set({
      name: input.name?.trim() || existing.name,
      updatedAt: new Date(),
    })
    .where(and(eq(expenseReports.id, id), eq(expenseReports.userId, userId)))
    .returning()

  if (results.length === 0) {
    return null
  }

  const row = results[0]
  return {
    ...row,
    status: row.status as ReportStatus,
  }
}

export async function deleteReport(id: string, userId: string): Promise<boolean> {
  const existing = await getReportById(id, userId)

  if (!existing) {
    return false
  }

  if (existing.status !== 'open') {
    throw new Error('Only open reports can be deleted')
  }

  const result = await db.delete(expenseReports).where(and(eq(expenseReports.id, id), eq(expenseReports.userId, userId))).returning()

  return result.length > 0
}

export async function getReportCountsByStatus(userId: string): Promise<ReportCountsByStatus> {
  const results = await db
    .select({
      status: expenseReports.status,
      count: count(),
    })
    .from(expenseReports)
    .where(eq(expenseReports.userId, userId))
    .groupBy(expenseReports.status)

  const counts: ReportCountsByStatus = {
    open: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
  }

  for (const row of results) {
    counts[row.status as ReportStatus] = row.count
  }

  return counts
}

export async function getSubmittedReportsCount(): Promise<number> {
  const results = await db
    .select({ count: count() })
    .from(expenseReports)
    .where(eq(expenseReports.status, 'submitted'))

  return results[0]?.count ?? 0
}

export async function getRecentReports(userId: string, limit: number = 5): Promise<ExpenseReportSummary[]> {
  const results = await db
    .select({
      id: expenseReports.id,
      userId: expenseReports.userId,
      name: expenseReports.name,
      status: expenseReports.status,
      createdAt: expenseReports.createdAt,
      updatedAt: expenseReports.updatedAt,
      expenseCount: sql<number>`COALESCE(count(${expenses.id}), 0)::int`,
      totalAmount: sql<string | null>`COALESCE(sum(${expenses.amount}), 0)::numeric(10,2)`,
    })
    .from(expenseReports)
    .leftJoin(expenses, eq(expenses.reportId, expenseReports.id))
    .where(eq(expenseReports.userId, userId))
    .groupBy(expenseReports.id)
    .orderBy(desc(expenseReports.createdAt))
    .limit(limit)

  return results.map((row) => ({
    ...row,
    status: row.status as ReportStatus,
  }))
}
