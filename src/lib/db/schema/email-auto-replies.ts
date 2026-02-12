import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const emailAutoReplies = pgTable(
  'email_auto_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderEmail: text('sender_email').notNull(), // Stored lowercase
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('email_auto_replies_sender_idx').on(table.senderEmail, table.sentAt)]
)

export type EmailAutoReply = typeof emailAutoReplies.$inferSelect
export type NewEmailAutoReply = typeof emailAutoReplies.$inferInsert
