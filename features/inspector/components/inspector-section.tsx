'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface InspectorSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function InspectorSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
  className,
}: InspectorSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn('border-b border-border last:border-b-0', className)}>
      {/* Section header - clickable to toggle */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start gap-2 px-0 py-2 h-auto font-medium text-sm text-muted-foreground hover:text-foreground hover:bg-transparent"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 text-left">{title}</span>
        {badge && <span className="shrink-0">{badge}</span>}
      </Button>

      {/* Section content */}
      {isOpen && (
        <div className="pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}
