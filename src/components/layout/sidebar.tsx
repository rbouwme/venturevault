'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Star,
  Users,
  Target,
  Bookmark,
  Mail,
  Send,
  Settings,
  RefreshCw,
  ScrollText,
  Briefcase,
  BarChart2,
  Building2,
} from 'lucide-react'

const adminItems = [
  { title: 'Ingestion', href: '/admin', icon: RefreshCw },
  { title: 'Logs', href: '/admin/logs', icon: ScrollText },
]

function getCountryParam(pathname: string): string {
  if (pathname.startsWith('/dashboard/canada')) return '?country=CA'
  if (pathname.startsWith('/dashboard/us')) return '?country=US'
  return ''
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const countryParam = getCountryParam(pathname)

  const navItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Watchlist', href: `/dashboard/watchlist${countryParam}`, icon: Star },
    { title: 'Contacts', href: `/dashboard/contacts${countryParam}`, icon: Users },
    { title: 'Prospects', href: `/dashboard/prospects${countryParam}`, icon: Target },
    { title: 'Applications', href: '/dashboard/applications', icon: Briefcase },
    { title: 'Saved Searches', href: `/dashboard/saved-searches${countryParam}`, icon: Bookmark },
    { title: 'Cold Emails', href: `/dashboard/cold-emails${countryParam}`, icon: Mail },
    { title: 'Outreach', href: `/dashboard/outreach${countryParam}`, icon: Send },
    { title: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    { title: 'Investors', href: '/dashboard/investors', icon: Building2 },
    { title: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <aside className="hidden md:flex h-[calc(100vh-3.5rem)] w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <nav className="flex-1 px-2 py-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary/10 text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50')} />
                {item.title}
              </Link>
            )
          })}
        </div>

        {isAdmin && (
          <div className="mt-4">
            <p className="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary/10 text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50')} />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}
