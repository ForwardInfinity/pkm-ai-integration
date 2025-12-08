'use client'

import { useMemo } from 'react'
import { diffWords, diffSentences } from 'diff'
import { cn } from '@/lib/utils'

type DiffMode = 'words' | 'sentences'

// Shared styling for diff parts - soft gray for removed (non-judgmental)
const DIFF_STYLES = {
  added: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100 rounded px-1 py-0.5",
  removed: "line-through text-muted-foreground/40 decoration-muted-foreground/30",
}

interface InlineDiffTextProps {
  original: string
  cleaned: string
  className?: string
  mode?: DiffMode
}

export function InlineDiffText({ original, cleaned, className, mode = 'words' }: InlineDiffTextProps) {
  const parts = useMemo(() => {
    if (!original && !cleaned) return []
    const diffFn = mode === 'sentences' ? diffSentences : diffWords
    return diffFn(original || '', cleaned || '')
  }, [original, cleaned, mode])

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
            <span key={index} className={DIFF_STYLES.added}>
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span key={index} className={DIFF_STYLES.removed}>
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
  mode?: DiffMode
}

export function InlineDiffInput({
  original,
  cleaned,
  placeholder,
  className,
  multiline = false,
  mode = 'words',
}: InlineDiffInputProps) {
  const parts = useMemo(() => {
    if (!original && !cleaned) return []
    const diffFn = mode === 'sentences' ? diffSentences : diffWords
    return diffFn(original || '', cleaned || '')
  }, [original, cleaned, mode])

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
            <span key={index} className={DIFF_STYLES.added}>
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span key={index} className={DIFF_STYLES.removed}>
              {part.value}
            </span>
          )
        }
        return <span key={index}>{part.value}</span>
      })}
    </Component>
  )
}
