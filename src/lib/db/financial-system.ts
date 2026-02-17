/**
 * Drizzle client and table schemas for the financial-system database.
 *
 * Connection uses the `expense_reports_role` Postgres role with:
 *   - SELECT on `funds`, `accounts`
 *   - INSERT + SELECT on `staging_records`
 *
 * These table definitions are NOT managed by this app's migrations —
 * they exist solely for type-safe query building.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  numeric,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ─── External Table Schemas ────────────────────────────────────────

export const funds = pgTable('funds', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  restrictionType: varchar('restriction_type', { length: 50 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
})

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
})

export const stagingRecords = pgTable(
  'staging_records',
  {
    id: serial('id').primaryKey(),
    sourceApp: varchar('source_app', { length: 50 }).notNull(),
    sourceRecordId: varchar('source_record_id', { length: 255 }).notNull(),
    recordType: varchar('record_type', { length: 50 }).notNull(),
    employeeId: varchar('employee_id', { length: 255 }).notNull(),
    referenceId: varchar('reference_id', { length: 255 }).notNull(),
    dateIncurred: date('date_incurred', { mode: 'string' }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    fundId: integer('fund_id').notNull(),
    glAccountId: integer('gl_account_id'),
    metadata: jsonb('metadata').notNull().default({}),
    status: varchar('status', { length: 20 }).notNull().default('received'),
    glTransactionId: integer('gl_transaction_id'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('staging_records_source_uniq').on(table.sourceApp, table.sourceRecordId),
    index('staging_records_employee_idx').on(table.employeeId),
    index('staging_records_status_idx').on(table.status),
    index('staging_records_date_idx').on(table.dateIncurred),
  ]
)

const financialSchema = { funds, accounts, stagingRecords }

// ─── Database Client ───────────────────────────────────────────────

function createFinancialSystemDb(): NeonHttpDatabase<typeof financialSchema> | null {
  const connectionString = process.env.FINANCIAL_SYSTEM_DATABASE_URL
  if (!connectionString) {
    return null
  }
  const sql: NeonQueryFunction<boolean, boolean> = neon(connectionString)
  return drizzle(sql, { schema: financialSchema })
}

const _financialDb = createFinancialSystemDb()

export const financialDb = _financialDb
