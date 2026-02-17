import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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
    // Financial system integration (Phase 3+4)
    fundId: integer('fund_id'),
    glAccountId: integer('gl_account_id'),
    fundName: text('fund_name'),
    glAccountName: text('gl_account_name'),
    receiptUrl: text('receipt_url'),
    receiptThumbnailUrl: text('receipt_thumbnail_url'),
    originAddress: text('origin_address'),
    destinationAddress: text('destination_address'),
    miles: numeric('miles', { precision: 6, scale: 2 }),
    aiConfidence: jsonb('ai_confidence'),
    // Email receipt fields (Phase 13)
    source: text('source').default('camera').notNull(),
    emailReceivedAt: timestamp('email_received_at', { withTimezone: true }),
    emailMessageId: text('email_message_id'),
    duplicateFlag: boolean('duplicate_flag').default(false).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('expenses_report_id_idx').on(table.reportId)]
)

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
