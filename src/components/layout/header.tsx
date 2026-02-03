'use client'

import { Nav } from '@/components/layout/nav'
import { UserMenu } from '@/components/layout/user-menu'
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
      <div className="container flex h-14 items-center">
        {/* Logo / App Name */}
        <Link href="/" className="mr-6 flex items-center space-x-2" data-testid="header-logo">
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-semibold">Expense Reports</span>
        </Link>

        {/* Navigation */}
        <div className="flex flex-1 items-center justify-between">
          <Nav />

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
