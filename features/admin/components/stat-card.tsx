'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: 'primary' | 'amber' | 'destructive' | 'emerald'
  className?: string
  animationDelay?: number
}

const iconColorClasses = {
  primary: 'bg-primary/10 text-primary ring-primary/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'primary',
  className,
  animationDelay = 0,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group rounded-xl border bg-card/50 p-5 transition-all duration-200',
        'hover:bg-card hover:shadow-md hover:shadow-black/[0.03] hover:border-border/80',
        'dark:hover:shadow-black/20',
        'animate-in fade-in slide-in-from-bottom-1 duration-300',
        className
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors duration-200',
            iconColorClasses[iconColor]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
