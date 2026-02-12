import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const userEmails = pgTable(
  'user_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    email: text('email').notNull().unique(), // Stored lowercase (ECP4)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('user_emails_user_id_idx').on(table.userId), index('user_emails_email_idx').on(table.email)]
)

export type UserEmail = typeof userEmails.$inferSelect
export type NewUserEmail = typeof userEmails.$inferInsert
