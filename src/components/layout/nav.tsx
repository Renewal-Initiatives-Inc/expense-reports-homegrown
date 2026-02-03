'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  testId: string
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', testId: 'nav-dashboard' },
  { href: '/reports', label: 'My Reports', testId: 'nav-reports' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6">
      {navItems.map((item) => (
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
