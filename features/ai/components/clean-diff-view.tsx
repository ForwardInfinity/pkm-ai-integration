'use client'

import { useMemo } from 'react'
import { diffSentences } from 'diff'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

interface CleanDiffTitleProps {
  original: string
  cleaned: string
  className?: string
}

export function CleanDiffTitle({ original, cleaned, className }: CleanDiffTitleProps) {
  const hasChanges = original !== cleaned

  if (!hasChanges) {
    return (
      <div className={cn("text-4xl md:text-5xl font-bold leading-tight tracking-tight", className)}>
        {original || <span className="text-muted-foreground/30">Untitled</span>}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-3">
        <div className="flex-1 text-4xl md:text-5xl font-bold leading-tight tracking-tight text-emerald-600 dark:text-emerald-400">
          {cleaned || <span className="text-muted-foreground/30">Untitled</span>}
        </div>
      </div>
      {original && original !== cleaned && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
          <span className="line-through">{original}</span>
        </div>
      )}
    </div>
  )
}

interface CleanDiffFieldProps {
  original: string
  cleaned: string
  placeholder?: string
  className?: string
}

export function CleanDiffField({ original, cleaned, placeholder, className }: CleanDiffFieldProps) {
  const hasChanges = original !== cleaned

  if (!hasChanges) {
    return (
      <div className={cn("text-base text-muted-foreground", className)}>
        {original || <span className="text-muted-foreground/40 italic">{placeholder}</span>}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="text-base text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 rounded-md px-2 py-1.5 border border-emerald-200 dark:border-emerald-800/50">
        {cleaned || <span className="text-muted-foreground/40 italic">{placeholder}</span>}
      </div>
      {original && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground/50">
          <Minus className="h-3 w-3" />
          <span className="line-through">{original}</span>
        </div>
      )}
    </div>
  )
}

interface DiffBlock {
  type: 'unchanged' | 'removed' | 'added' | 'modified'
  original?: string
  cleaned?: string
  content?: string
}

interface CleanDiffContentProps {
  original: string
  cleaned: string
  className?: string
}

export function CleanDiffContent({ original, cleaned, className }: CleanDiffContentProps) {
  const blocks = useMemo(() => {
    if (!original && !cleaned) return []
    
    const parts = diffSentences(original || '', cleaned || '')
    const result: DiffBlock[] = []
    
    let i = 0
    while (i < parts.length) {
      const part = parts[i]
      
      if (!part.added && !part.removed) {
        result.push({ type: 'unchanged', content: part.value })
        i++
      } else if (part.removed && parts[i + 1]?.added) {
        result.push({
          type: 'modified',
          original: part.value,
          cleaned: parts[i + 1].value,
        })
        i += 2
      } else if (part.removed) {
        result.push({ type: 'removed', original: part.value })
        i++
      } else if (part.added) {
        result.push({ type: 'added', cleaned: part.value })
        i++
      } else {
        i++
      }
    }
    
    return result
  }, [original, cleaned])

  const hasChanges = blocks.some(b => b.type !== 'unchanged')

  if (!hasChanges) {
    return (
      <div className={cn("prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap", className)}>
        {original}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1 prose prose-neutral dark:prose-invert max-w-none", className)}>
      {blocks.map((block, index) => {
        if (block.type === 'unchanged') {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {block.content}
            </span>
          )
        }

        if (block.type === 'removed') {
          return (
            <span
              key={index}
              className="text-muted-foreground/50 line-through decoration-muted-foreground/30 whitespace-pre-wrap"
            >
              {block.original}
            </span>
          )
        }

        if (block.type === 'added') {
          return (
            <span
              key={index}
              className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded px-1 whitespace-pre-wrap"
            >
              {block.cleaned}
            </span>
          )
        }

        if (block.type === 'modified') {
          return (
            <span key={index} className="whitespace-pre-wrap">
              <span className="text-muted-foreground/50 line-through decoration-muted-foreground/30">
                {block.original}
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded px-1">
                {block.cleaned}
              </span>
            </span>
          )
        }

        return null
      })}
    </div>
  )
}

interface ChangeSummaryProps {
  original: { title: string; problem: string; content: string }
  cleaned: { title: string; problem: string; content: string }
  className?: string
}

export function ChangeSummary({ original, cleaned, className }: ChangeSummaryProps) {
  const changes = useMemo(() => {
    let count = 0
    const details: string[] = []

    if (original.title !== cleaned.title) {
      count++
      details.push('title')
    }
    if (original.problem !== cleaned.problem) {
      count++
      details.push('problem')
    }
    if (original.content !== cleaned.content) {
      const contentParts = diffSentences(original.content || '', cleaned.content || '')
      const contentChanges = contentParts.filter(p => p.added || p.removed).length
      count += Math.ceil(contentChanges / 2)
      if (contentChanges > 0) details.push('content')
    }

    return { count, details }
  }, [original, cleaned])

  if (changes.count === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No changes suggested
      </div>
    )
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
      "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50",
      "text-sm text-emerald-700 dark:text-emerald-300",
      className
    )}>
      <Plus className="h-3.5 w-3.5" />
      <span className="font-medium">{changes.count} {changes.count === 1 ? 'change' : 'changes'}</span>
      <span className="text-emerald-600/60 dark:text-emerald-400/60">
        in {changes.details.join(', ')}
      </span>
    </div>
  )
}
