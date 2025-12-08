'use client'

import { useMemo } from 'react'
import { diffWords } from 'diff'
import { cn } from '@/lib/utils'

interface InlineDiffTextProps {
  original: string
  cleaned: string
  className?: string
}

export function InlineDiffText({ original, cleaned, className }: InlineDiffTextProps) {
  const parts = useMemo(() => {
    if (!original && !cleaned) return []
    return diffWords(original || '', cleaned || '')
  }, [original, cleaned])

  const hasChanges = useMemo(() => {
    return parts.some((part) => part.added || part.removed)
  }, [parts])

  if (!hasChanges) {
    return <span className={className}>{original}</span>
  }

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 rounded-sm px-0.5"
            >
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="line-through text-muted-foreground/50 decoration-muted-foreground/30"
            >
              {part.value}
            </span>
          )
        }
        return <span key={index}>{part.value}</span>
      })}
    </span>
  )
}

interface InlineDiffInputProps {
  original: string
  cleaned: string
  placeholder?: string
  className?: string
  multiline?: boolean
}

export function InlineDiffInput({
  original,
  cleaned,
  placeholder,
  className,
  multiline = false,
}: InlineDiffInputProps) {
  const parts = useMemo(() => {
    if (!original && !cleaned) return []
    return diffWords(original || '', cleaned || '')
  }, [original, cleaned])

  const hasChanges = useMemo(() => {
    return parts.some((part) => part.added || part.removed)
  }, [parts])

  if (!hasChanges && !original && !cleaned) {
    return (
      <div className={cn('text-muted-foreground/40 italic', className)}>
        {placeholder}
      </div>
    )
  }

  if (!hasChanges) {
    return <div className={className}>{original}</div>
  }

  const Component = multiline ? 'div' : 'span'

  return (
    <Component className={cn('whitespace-pre-wrap', className)}>
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 rounded-sm px-0.5"
            >
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="line-through text-muted-foreground/50 decoration-muted-foreground/30"
            >
              {part.value}
            </span>
          )
        }
        return <span key={index}>{part.value}</span>
      })}
    </Component>
  )
}
