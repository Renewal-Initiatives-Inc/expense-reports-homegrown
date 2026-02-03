import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

// Type for IRS mileage rate setting
export interface MileageRateSetting {
  rate: number
  effectiveDate: string
}
