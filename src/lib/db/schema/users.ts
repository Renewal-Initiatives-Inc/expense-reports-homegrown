import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const userRoleEnum = ['user', 'admin'] as const
export type UserRole = (typeof userRoleEnum)[number]

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(), // Zitadel sub
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: userRoleEnum }).notNull().default('user'),
    lastLoginAt: timestamp('last_login_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('users_role_idx').on(table.role)]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
