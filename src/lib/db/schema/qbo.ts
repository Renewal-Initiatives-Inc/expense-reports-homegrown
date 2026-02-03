import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const qboCache = pgTable('qbo_cache', {
  key: text('key').primaryKey(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
})

export type QboCache = typeof qboCache.$inferSelect
export type NewQboCache = typeof qboCache.$inferInsert

export const qboTokens = pgTable('qbo_tokens', {
  id: integer('id').primaryKey().default(1),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  realmId: text('realm_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

export type QboTokens = typeof qboTokens.$inferSelect
export type NewQboTokens = typeof qboTokens.$inferInsert
