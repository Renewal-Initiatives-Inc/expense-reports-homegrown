import { integer, numeric, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core'
import { expenseReports } from './expense-reports'
import { expenses } from './expenses'

export const stagingSyncStatus = pgTable(
  'staging_sync_status',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => expenseReports.id),
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id),
    sourceRecordId: text('source_record_id').notNull(),
    fundId: integer('fund_id').notNull(),
    glAccountId: integer('gl_account_id').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    status: text('status').notNull().default('received'),
    syncedAt: timestamp('synced_at').notNull().defaultNow(),
    lastCheckedAt: timestamp('last_checked_at'),
  },
  (table) => [uniqueIndex('staging_sync_report_expense_idx').on(table.reportId, table.expenseId)]
)

export type StagingSyncStatus = typeof stagingSyncStatus.$inferSelect
