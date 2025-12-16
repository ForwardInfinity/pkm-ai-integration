'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ConflictWithNotes } from '../types'

interface ConflictCardProps {
  conflict: ConflictWithNotes
  onDismiss: (id: string) => void
  isDismissing?: boolean
}

export function ConflictCard({ conflict, onDismiss, isDismissing }: ConflictCardProps) {
  const createdAt = new Date(conflict.created_at)
  const formattedDate = formatDistanceToNow(createdAt, { addSuffix: true })

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card/50 p-5 transition-all duration-200',
        'hover:bg-card hover:shadow-md hover:shadow-black/[0.03] hover:border-border/80',
        'dark:hover:shadow-black/20'
      )}
    >
      <div className="relative flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/notes/${conflict.note_a.id}`}
                  className="text-[15px] font-medium leading-tight tracking-tight text-foreground hover:text-primary hover:underline"
                >
                  {conflict.note_a.title || 'Untitled'}
                </Link>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Link
                  href={`/notes/${conflict.note_b.id}`}
                  className="text-[15px] font-medium leading-tight tracking-tight text-foreground hover:text-primary hover:underline"
                >
                  {conflict.note_b.title || 'Untitled'}
                </Link>
              </div>

              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/80">
                {conflict.explanation}
              </p>
            </div>

            <Badge
              variant={conflict.conflict_type === 'contradiction' ? 'destructive' : 'secondary'}
              className="shrink-0 capitalize"
            >
              {conflict.conflict_type}
            </Badge>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground/60">
              Detected {formattedDate}
            </span>

            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(conflict.id)}
                disabled={isDismissing}
                className="h-8 gap-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
