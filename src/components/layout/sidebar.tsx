'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    title: 'Watchlist',
    href: '/dashboard/watchlist',
    icon: '⭐',
  },
  {
    title: 'Prospects',
    href: '/dashboard/prospects',
    icon: '🎯',
  },
  {
    title: 'Saved Searches',
    href: '/dashboard/saved-searches',
    icon: '🔍',
  },
  {
    title: 'Outreach',
    href: '/dashboard/outreach',
    icon: '✉️',
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: '⚙️',
  },
]

const adminItems = [
  {
    title: 'Ingestion',
    href: '/admin',
    icon: '🔄',
  },
  {
    title: 'Logs',
    href: '/admin/logs',
    icon: '📝',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <aside className="hidden md:flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r bg-background">
      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span>{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </div>

        {isAdmin && (
          <>
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </p>
            </div>
            <div className="space-y-1 pt-2">
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span>{item.icon}</span>
                  {item.title}
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>
    </aside>
  )
}
