import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const reportStatusEnum = ['open', 'submitted', 'approved', 'rejected'] as const
export type ReportStatus = (typeof reportStatusEnum)[number]

export const expenseReports = pgTable(
  'expense_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name'),
    status: text('status', { enum: reportStatusEnum }).notNull().default('open'),
    submittedAt: timestamp('submitted_at'),
    reviewedAt: timestamp('reviewed_at'),
    reviewerId: text('reviewer_id'),
    reviewerComment: text('reviewer_comment'),
    qboBillId: text('qbo_bill_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('expense_reports_user_id_idx').on(table.userId), index('expense_reports_status_idx').on(table.status)]
)

export type ExpenseReport = typeof expenseReports.$inferSelect
export type NewExpenseReport = typeof expenseReports.$inferInsert
