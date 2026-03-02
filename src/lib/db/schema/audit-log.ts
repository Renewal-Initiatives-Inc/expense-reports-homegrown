import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    userEmail: text('user_email').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    beforeState: jsonb('before_state').$type<Record<string, unknown> | null>(),
    afterState: jsonb('after_state').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_audit_log_user_id').on(table.userId),
    entityIdx: index('idx_audit_log_entity').on(table.entityType, table.entityId),
    createdAtIdx: index('idx_audit_log_created_at').on(table.createdAt),
  })
)
