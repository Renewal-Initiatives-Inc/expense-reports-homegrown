export type NotificationType =
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'
  | 'email_receipt_processed'
  | 'email_sender_unrecognized'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  reportId: string | null
  message: string
  read: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}
