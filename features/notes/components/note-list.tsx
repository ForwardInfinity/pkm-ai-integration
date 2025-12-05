'use client'

import { useMemo } from 'react'
import { Pin, Loader2 } from 'lucide-react'
import { useNotes } from '../hooks'
import { NoteListItem } from './note-list-item'
import { EmptyState } from './empty-state'

export function NoteList() {
  const { data: notes, isLoading, error } = useNotes()

  const { pinnedNotes, unpinnedNotes } = useMemo(() => {
    if (!notes) return { pinnedNotes: [], unpinnedNotes: [] }
    
    return {
      pinnedNotes: notes.filter((note) => note.is_pinned),
      unpinnedNotes: notes.filter((note) => !note.is_pinned),
    }
  }, [notes])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <p className="text-sm text-destructive">
          Failed to load notes. Please try again.
        </p>
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Pin className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">
              Pinned
            </h2>
          </div>
          <div className="grid gap-3">
            {pinnedNotes.map((note) => (
              <NoteListItem key={note.id} note={note} />
            ))}
          </div>
        </section>
      )}

      {/* All Notes Section */}
      <section>
        {pinnedNotes.length > 0 && (
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            All Notes
          </h2>
        )}
        <div className="grid gap-3">
          {unpinnedNotes.map((note) => (
            <NoteListItem key={note.id} note={note} />
          ))}
        </div>
      </section>
    </div>
  )
}
