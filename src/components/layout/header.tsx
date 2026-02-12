'use client'

import { Nav } from '@/components/layout/nav'
import { UserMenu } from '@/components/layout/user-menu'
import { NotificationBell } from '@/components/notifications/notification-bell'
import type { AppRole } from '@/lib/auth'
import { FileText } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  user: {
    name: string
    email: string
    image?: string
    role: AppRole
  }
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 md:px-6">
        {/* Logo / App Name */}
        <Link href="/" className="mr-6 flex items-center space-x-2" data-testid="header-logo">
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-semibold">Expense Reports</span>
        </Link>

        {/* Navigation */}
        <div className="flex flex-1 items-center justify-between">
          <Nav userRole={user.role} />

          {/* Notifications and User Menu */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  )
}
