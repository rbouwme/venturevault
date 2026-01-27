'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: '📊' },
  { title: 'Watchlist', href: '/dashboard/watchlist', icon: '⭐' },
  { title: 'Prospects', href: '/dashboard/prospects', icon: '🎯' },
  { title: 'Saved Searches', href: '/dashboard/saved-searches', icon: '🔍' },
  { title: 'Outreach', href: '/dashboard/outreach', icon: '✉️' },
  { title: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
]

const adminItems = [
  { title: 'Ingestion', href: '/admin', icon: '🔄' },
  { title: 'Logs', href: '/admin/logs', icon: '📝' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="md:hidden px-2" aria-label="Menu">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="border-b p-4">
          <span className="font-bold">Startup Funding Tracker</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
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

          {isAdmin && (
            <>
              <div className="pt-4">
                <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Admin
                </p>
              </div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
