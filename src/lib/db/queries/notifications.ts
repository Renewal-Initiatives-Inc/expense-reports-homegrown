import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '..'
import { notifications, type Notification, type NotificationType } from '../schema'

/**
 * Create a new notification
 */
export async function createNotification(data: {
  userId: string
  type: NotificationType
  reportId: string
  message: string
}): Promise<Notification> {
  const result = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      type: data.type,
      reportId: data.reportId,
      message: data.message,
      read: false,
    })
    .returning()

  return result[0]
}

/**
 * Get notifications for a user
 */
export async function getNotificationsForUser(userId: string, limit: number = 20): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))

  return result[0]?.count ?? 0
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning()

  return result.length > 0
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .returning()

  return result.length
}

/**
 * Delete old read notifications (cleanup job)
 */
export async function deleteOldReadNotifications(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  // This is a simplified version - in production you'd want to use SQL date comparison
  const result = await db
    .delete(notifications)
    .where(eq(notifications.read, true))
    .returning()

  return result.length
}

// ============================================================================
// NOTIFICATION HELPERS (called from workflow functions)
// ============================================================================

/**
 * Create notification when a report is approved
 */
export async function notifyReportApproved(
  submitterUserId: string,
  reportId: string,
  reportName: string | null,
  approverComment?: string
): Promise<Notification> {
  const name = reportName || 'Untitled Report'
  let message = `Your report "${name}" has been approved`
  if (approverComment) {
    message += `: ${approverComment.slice(0, 100)}${approverComment.length > 100 ? '...' : ''}`
  }

  return createNotification({
    userId: submitterUserId,
    type: 'report_approved',
    reportId,
    message,
  })
}

/**
 * Create notification when a report is rejected
 */
export async function notifyReportRejected(
  submitterUserId: string,
  reportId: string,
  reportName: string | null,
  rejectionComment: string
): Promise<Notification> {
  const name = reportName || 'Untitled Report'
  const commentPreview = rejectionComment.slice(0, 100) + (rejectionComment.length > 100 ? '...' : '')
  const message = `Your report "${name}" was returned: ${commentPreview}`

  return createNotification({
    userId: submitterUserId,
    type: 'report_rejected',
    reportId,
    message,
  })
}

/**
 * Create notification when a report is submitted (for admins)
 * Note: This requires knowing admin user IDs. For now, this is a placeholder
 * that can be called when admin user IDs are available.
 */
export async function notifyReportSubmitted(
  adminUserIds: string[],
  reportId: string,
  reportName: string | null,
  submitterName: string
): Promise<Notification[]> {
  const name = reportName || 'Untitled Report'
  const message = `${submitterName} submitted "${name}" for approval`

  const results = await Promise.all(
    adminUserIds.map((adminUserId) =>
      createNotification({
        userId: adminUserId,
        type: 'report_submitted',
        reportId,
        message,
      })
    )
  )

  return results
}
