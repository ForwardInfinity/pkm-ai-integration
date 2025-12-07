'use client'

import { useMemo } from 'react'
import { Pin, Loader2, FileText, Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotes } from '../hooks'
import { NoteListItem } from './note-list-item'
import { EmptyState } from './empty-state'

export function NoteList() {
  const { data: notes, isLoading, error } = useNotes()

  const { pinnedNotes, unpinnedNotes, totalCount } = useMemo(() => {
    if (!notes) return { pinnedNotes: [], unpinnedNotes: [], totalCount: 0 }
    
    return {
      pinnedNotes: notes.filter((note) => note.is_pinned),
      unpinnedNotes: notes.filter((note) => !note.is_pinned),
      totalCount: notes.length,
    }
  }, [notes])

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
            <div className="relative rounded-full bg-background p-4 shadow-sm ring-1 ring-border/50">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-destructive/5 px-4 py-16">
        <div className="rounded-2xl bg-background p-8 text-center shadow-sm ring-1 ring-destructive/20">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <FileText className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Unable to load notes</p>
          <p className="mt-1 text-xs text-muted-foreground">Please check your connection and try again</p>
        </div>
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return <EmptyState />
  }

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/10">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-6 py-5 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                  <Sparkles className="h-4 w-4 text-primary/70" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    Notes
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {totalCount} {totalCount === 1 ? 'note' : 'notes'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-10">
            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <section className="animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                    <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pinned
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {pinnedNotes.length}
                  </span>
                </div>
                <div className="grid gap-3">
                  {pinnedNotes.map((note, index) => (
                    <div
                      key={note.id}
                      className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <NoteListItem note={note} isPinned />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All Notes Section */}
            <section className="animate-in fade-in slide-in-from-top-2 duration-500" style={{ animationDelay: '100ms' }}>
              {pinnedNotes.length > 0 && (
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/5">
                    <FileText className="h-3 w-3 text-primary/60" />
                  </div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    All Notes
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {unpinnedNotes.length}
                  </span>
                </div>
              )}
              <div className="grid gap-3">
                {unpinnedNotes.map((note, index) => (
                  <div
                    key={note.id}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                    style={{ animationDelay: `${(pinnedNotes.length + index) * 30}ms` }}
                  >
                    <NoteListItem note={note} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer spacing */}
          <div className="h-8" />
        </main>
      </div>
    </ScrollArea>
  )
}
