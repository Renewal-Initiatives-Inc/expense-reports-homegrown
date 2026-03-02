import { db } from '..'
import { auditLog } from '../schema'

export const AUDIT_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REOPENED: 'reopened',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

/**
 * Log an audit event. Accepts an optional transaction executor so the
 * audit INSERT participates in the same DB transaction as the mutation.
 */
export async function logAuditEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executor: typeof db | any,
  event: {
    userId: string
    userEmail: string
    action: AuditAction
    entityType: string
    entityId: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
  }
) {
  await executor.insert(auditLog).values({
    userId: event.userId,
    userEmail: event.userEmail,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    beforeState: event.beforeState ?? null,
    afterState: event.afterState ?? null,
  })
}
