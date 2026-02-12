import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { expenseReports } from './expense-reports'

export const notificationTypeEnum = [
  'report_submitted',
  'report_approved',
  'report_rejected',
  'email_receipt_processed',
  'email_sender_unrecognized',
] as const
export type NotificationType = (typeof notificationTypeEnum)[number]

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    type: text('type', { enum: notificationTypeEnum }).notNull(),
    reportId: uuid('report_id').references(() => expenseReports.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    read: boolean('read').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('notifications_user_id_idx').on(table.userId), index('notifications_read_idx').on(table.read)]
)

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
