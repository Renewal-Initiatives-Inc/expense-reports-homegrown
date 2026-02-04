'use client'

import { cn } from '@/lib/utils'
import type { AppRole } from '@/lib/auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  testId: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', testId: 'nav-dashboard' },
  { href: '/reports', label: 'My Reports', testId: 'nav-reports' },
  { href: '/admin/approvals', label: 'Approvals', testId: 'nav-approvals', adminOnly: true },
  { href: '/admin/settings', label: 'Settings', testId: 'nav-settings', adminOnly: true },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/'
  }
  if (href.startsWith('/admin')) {
    return pathname.startsWith('/admin')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface NavProps {
  userRole?: AppRole
}

export function Nav({ userRole }: NavProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter((item) => !item.adminOnly || userRole === 'admin')

  return (
    <nav className="flex items-center space-x-6">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-testid={item.testId}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            isActive(pathname, item.href) ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
