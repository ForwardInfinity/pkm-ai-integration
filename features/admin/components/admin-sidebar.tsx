'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  ChevronLeft,
  Shield,
  Database,
  Bell,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Content', href: '/admin/content', icon: FileText },
  { label: 'System', href: '/admin/system', icon: Activity },
  { label: 'Database', href: '/admin/database', icon: Database },
]

const bottomNavItems: NavItem[] = [
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-border/40 bg-gradient-to-b from-card via-card to-card/80">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border/40 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
          <Shield className="h-4 w-4 text-background" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">Admin</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Control Panel
          </span>
        </div>
      </div>

      {/* Back to App */}
      <div className="px-3 py-3">
        <Link
          href="/notes"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
            'text-muted-foreground transition-all duration-200',
            'hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to App
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2">
        <div className="mb-2 px-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
            Navigation
          </span>
        </div>
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))
            const isOverviewActive = item.href === '/admin' && pathname === '/admin'
            const active = item.href === '/admin' ? isOverviewActive : isActive

            return (
              <li
                key={item.href}
                className="animate-in fade-in slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                    'transition-all duration-200',
                    active
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      !active && 'group-hover:scale-110'
                    )}
                  />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cn(
                        'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                        active
                          ? 'bg-background/20 text-background'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border/40 px-3 py-3">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                    'transition-all duration-200',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-medium text-muted-foreground">
            All systems operational
          </span>
        </div>
      </div>
    </aside>
  )
}
