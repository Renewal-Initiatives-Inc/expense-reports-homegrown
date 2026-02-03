import { boolean, date, index, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { expenseReports } from './expense-reports'

export const expenseTypeEnum = ['out_of_pocket', 'mileage'] as const
export type ExpenseType = (typeof expenseTypeEnum)[number]

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => expenseReports.id, { onDelete: 'cascade' }),
    type: text('type', { enum: expenseTypeEnum }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    date: date('date').notNull(),
    merchant: text('merchant'),
    memo: text('memo'),
    categoryId: text('category_id'),
    categoryName: text('category_name'),
    projectId: text('project_id'),
    projectName: text('project_name'),
    billable: boolean('billable').default(false),
    receiptUrl: text('receipt_url'),
    receiptThumbnailUrl: text('receipt_thumbnail_url'),
    originAddress: text('origin_address'),
    destinationAddress: text('destination_address'),
    miles: numeric('miles', { precision: 6, scale: 2 }),
    aiConfidence: jsonb('ai_confidence'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('expenses_report_id_idx').on(table.reportId)]
)

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
