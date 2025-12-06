'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTabsActions } from '@/stores'
import type { NoteListItem as NoteListItemType } from '../types'

interface NoteListItemProps {
  note: NoteListItemType
}

export function NoteListItem({ note }: NoteListItemProps) {
  const router = useRouter()
  const { openTab } = useTabsActions()

  const formattedDate = formatDistanceToNow(new Date(note.updated_at), {
    addSuffix: true,
  })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push(`/notes/${note.id}`)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      openTab(note.id, note.title || 'Untitled', false)
    }
  }

  return (
    <a
      href={`/notes/${note.id}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className={cn(
        'group block rounded-lg border bg-card p-4 transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-foreground group-hover:text-primary">
              {note.title || 'Untitled'}
            </h3>
            {note.is_pinned && (
              <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
          
          {note.problem && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {note.problem}
            </p>
          )}
        </div>
        
        <span className="shrink-0 text-xs text-muted-foreground">
          {formattedDate}
        </span>
      </div>
      
      {note.tags && note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </a>
  )
}
