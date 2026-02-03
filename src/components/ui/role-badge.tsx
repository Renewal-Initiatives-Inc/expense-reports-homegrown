'use client'

import { Badge } from '@/components/ui/badge'
import { AppRole } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: AppRole
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const isAdmin = role === 'admin'

  return (
    <Badge
      variant={isAdmin ? 'default' : 'secondary'}
      className={cn(isAdmin && 'bg-primary hover:bg-primary/90', className)}
      data-testid="role-badge"
    >
      {isAdmin ? 'Admin' : 'User'}
    </Badge>
  )
}
