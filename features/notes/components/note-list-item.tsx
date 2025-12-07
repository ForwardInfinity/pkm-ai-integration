'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Pin, Clock, Hash, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useTabsActions } from '@/stores'
import type { NoteListItem as NoteListItemType } from '../types'

interface NoteListItemProps {
  note: NoteListItemType
  isPinned?: boolean
  selectionMode?: boolean
  isSelected?: boolean
  onSelectionChange?: (id: string, selected: boolean) => void
}

export function NoteListItem({
  note,
  isPinned,
  selectionMode,
  isSelected,
  onSelectionChange,
}: NoteListItemProps) {
  const router = useRouter()
  const { openTab } = useTabsActions()

  const formattedDate = formatDistanceToNow(new Date(note.updated_at), {
    addSuffix: true,
  })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (selectionMode && onSelectionChange) {
      onSelectionChange(note.id, !isSelected)
      return
    }
    openTab(note.id, note.title || 'Untitled', true)
    router.push(`/notes/${note.id}`)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectionMode) return
    if (e.button === 1) {
      e.preventDefault()
      openTab(note.id, note.title || 'Untitled', false)
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(note.id, checked)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick(e as unknown as React.MouseEvent)
        }
      }}
      className={cn(
        'group relative block overflow-hidden rounded-xl border bg-card/50 p-5 transition-all duration-200 cursor-pointer',
        'hover:bg-card hover:shadow-md hover:shadow-black/[0.03] hover:border-border/80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'dark:hover:shadow-black/20',
        isPinned && 'bg-gradient-to-br from-amber-500/[0.02] to-transparent border-amber-500/20 dark:from-amber-500/[0.04]',
        isSelected && 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
      )}
    >
      {/* Subtle hover gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex items-start gap-4">
        {/* Selection checkbox or Icon indicator */}
        {selectionMode ? (
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="h-5 w-5"
            />
          </div>
        ) : (
          <div className={cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
            isPinned 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
              : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/70'
          )}>
            {isPinned ? (
              <Pin className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                'truncate text-[15px] font-medium leading-tight tracking-tight text-foreground transition-colors duration-200',
                'group-hover:text-foreground'
              )}>
                {note.title || 'Untitled'}
              </h3>
              
              {note.problem && (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/80">
                  {note.problem}
                </p>
              )}
            </div>
            
            {/* Timestamp */}
            <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground/60">
              <Clock className="h-3 w-3" />
              <span className="text-[11px] font-medium tabular-nums">
                {formattedDate}
              </span>
            </div>
          </div>
          
          {/* Tags and metadata */}
          {(note.tags && note.tags.length > 0) && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {note.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      'h-5 gap-1 rounded-md px-2 text-[10px] font-medium uppercase tracking-wide',
                      'bg-secondary/60 text-secondary-foreground/70 hover:bg-secondary',
                      'border-0 shadow-none'
                    )}
                  >
                    <Hash className="h-2.5 w-2.5 opacity-50" />
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <span className="ml-0.5 text-[10px] font-medium text-muted-foreground/50">
                    +{note.tags.length - 3} more
                  </span>
                )}
              </div>
              
              {/* Word count */}
              {note.word_count > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground/50">
                    {note.word_count.toLocaleString()} words
                  </span>
                </>
              )}
            </div>
          )}
          
          {/* Word count only (when no tags) */}
          {(!note.tags || note.tags.length === 0) && note.word_count > 0 && (
            <div className="mt-2.5">
              <span className="text-[11px] text-muted-foreground/50">
                {note.word_count.toLocaleString()} words
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
