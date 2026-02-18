import { cn } from '@/lib/utils'
import type { ReportStatus } from '@/types/reports'

interface StatusBadgeProps {
  status: ReportStatus
  className?: string
}

const statusConfig: Record<ReportStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-600 text-white dark:bg-green-600 dark:text-white',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      role="status"
      data-testid={`status-badge-${status}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
