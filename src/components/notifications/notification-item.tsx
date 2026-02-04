'use client'

import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notifications'
import { CheckCircle2, FileText, XCircle } from 'lucide-react'
import Link from 'next/link'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

function getIcon(type: NotificationType) {
  switch (type) {
    case 'report_approved':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'report_rejected':
      return <XCircle className="h-4 w-4 text-destructive" />
    case 'report_submitted':
      return <FileText className="h-4 w-4 text-blue-600" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  const href = notification.reportId ? `/reports/${notification.reportId}` : '#'

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-muted',
        !notification.read && 'bg-muted/50'
      )}
      data-testid={`notification-${notification.id}`}
    >
      <div className="mt-0.5 shrink-0">{getIcon(notification.type)}</div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', !notification.read && 'font-medium')}>{notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.read && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
    </Link>
  )
}
