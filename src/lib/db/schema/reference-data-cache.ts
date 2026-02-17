import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const referenceDataCache = pgTable('reference_data_cache', {
  key: text('key').primaryKey(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
})

export type ReferenceDataCache = typeof referenceDataCache.$inferSelect
