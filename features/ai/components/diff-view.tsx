'use client'

import { useMemo } from 'react'
import { diffWords } from 'diff'
import { cn } from '@/lib/utils'

interface DiffViewProps {
  original: string
  cleaned: string
  className?: string
}

export function DiffView({ original, cleaned, className }: DiffViewProps) {
  const parts = useMemo(() => {
    if (!original && !cleaned) return []
    return diffWords(original || '', cleaned || '')
  }, [original, cleaned])

  const hasChanges = useMemo(() => {
    return parts.some((part) => part.added || part.removed)
  }, [parts])

  if (!hasChanges) {
    return (
      <div className={cn('text-sm text-muted-foreground italic', className)}>
        No changes
      </div>
    )
  }

  return (
    <div className={cn('text-sm leading-relaxed whitespace-pre-wrap', className)}>
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            >
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 line-through dark:bg-red-900/30 dark:text-red-300"
            >
              {part.value}
            </span>
          )
        }
        return <span key={index}>{part.value}</span>
      })}
    </div>
  )
}

interface DiffSectionProps {
  label: string
  original: string
  cleaned: string
}

export function DiffSection({ label, original, cleaned }: DiffSectionProps) {
  const isEmpty = !original && !cleaned

  if (isEmpty) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </h4>
      <div className="p-3 rounded-md bg-muted/30 border border-border/50">
        <DiffView original={original} cleaned={cleaned} />
      </div>
    </div>
  )
}
