'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'highlight' | 'subtle'
  className?: string
  animationDelay?: number
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  animationDelay = 0,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl p-6 transition-all duration-300',
        'animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both',
        variant === 'default' && [
          'bg-card border border-border/50',
          'hover:border-border hover:shadow-lg hover:shadow-black/[0.03]',
          'dark:hover:shadow-black/20',
        ],
        variant === 'highlight' && [
          'bg-foreground text-background',
          'shadow-xl shadow-foreground/10',
        ],
        variant === 'subtle' && [
          'bg-muted/30 border border-transparent',
          'hover:bg-muted/50',
        ],
        className
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Background decoration */}
      <div
        className={cn(
          'absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.03] transition-transform duration-500',
          'group-hover:scale-150',
          variant === 'highlight' ? 'bg-background' : 'bg-foreground'
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          {/* Title */}
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-wider',
              variant === 'highlight'
                ? 'text-background/60'
                : 'text-muted-foreground'
            )}
          >
            {title}
          </p>

          {/* Value */}
          <div className="space-y-1">
            <p
              className={cn(
                'text-3xl font-bold tracking-tight tabular-nums',
                variant === 'highlight' ? 'text-background' : 'text-foreground'
              )}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>

            {subtitle && (
              <p
                className={cn(
                  'text-xs',
                  variant === 'highlight'
                    ? 'text-background/50'
                    : 'text-muted-foreground/70'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Trend */}
          {trend && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.value >= 0 ? 'text-emerald-500' : 'text-rose-500'
                )}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span
                className={cn(
                  'text-[10px]',
                  variant === 'highlight'
                    ? 'text-background/40'
                    : 'text-muted-foreground/50'
                )}
              >
                {trend.label}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300',
            'group-hover:scale-110',
            variant === 'highlight'
              ? 'bg-background/10'
              : 'bg-muted/50'
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              variant === 'highlight' ? 'text-background/70' : 'text-foreground/50'
            )}
          />
        </div>
      </div>
    </div>
  )
}
