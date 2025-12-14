'use client'

import { useMemo, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Pin, Loader2, FileText, Sparkles, CheckSquare, Tag, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotes } from '../hooks'
import { useNotesByTags } from '../hooks/use-tags'
import { NoteListItem } from './note-list-item'
import { EmptyState } from './empty-state'
import { SelectionToolbar } from './selection-toolbar'

export function NoteList() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const filterTag = searchParams.get('tag')

  // Use filtered query when tag param is present, otherwise use all notes
  const { data: allNotes, isLoading: isLoadingAll, error: errorAll } = useNotes()
  const { data: filteredNotes, isLoading: isLoadingFiltered, error: errorFiltered } = useNotesByTags(
    filterTag ? [filterTag] : [],
    !!filterTag
  )

  // Select which data to use based on filter
  const notes = filterTag ? filteredNotes : allNotes
  const isLoading = filterTag ? isLoadingFiltered : isLoadingAll
  const error = filterTag ? errorFiltered : errorAll

  // Clear tag filter
  const clearFilter = useCallback(() => {
    router.push('/notes')
  }, [router])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { pinnedNotes, unpinnedNotes, totalCount } = useMemo(() => {
    if (!notes) return { pinnedNotes: [], unpinnedNotes: [], totalCount: 0 }
    
    return {
      pinnedNotes: notes.filter((note) => note.is_pinned),
      unpinnedNotes: notes.filter((note) => !note.is_pinned),
      totalCount: notes.length,
    }
  }, [notes])

  const handleSelectionChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (notes) {
      setSelectedIds(new Set(notes.map((n) => n.id)))
    }
  }, [notes])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

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
                  {filterTag ? (
                    <Tag className="h-4 w-4 text-primary/70" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary/70" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    {filterTag ? 'Tagged Notes' : 'Notes'}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {totalCount} {totalCount === 1 ? 'note' : 'notes'}
                    {filterTag && ' with this tag'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {filterTag && (
                  <Badge
                    variant="secondary"
                    className="gap-1.5 pr-1.5 cursor-pointer hover:bg-secondary/80"
                    onClick={clearFilter}
                  >
                    <span>#{filterTag}</span>
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {totalCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectionMode ? handleCancelSelection() : setSelectionMode(true)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {selectionMode ? 'Cancel' : 'Select'}
                  </Button>
                )}
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
                      <NoteListItem
                        note={note}
                        isPinned
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(note.id)}
                        onSelectionChange={handleSelectionChange}
                      />
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
                    <NoteListItem
                      note={note}
                      selectionMode={selectionMode}
                      isSelected={selectedIds.has(note.id)}
                      onSelectionChange={handleSelectionChange}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer spacing */}
          <div className="h-8" />
        </main>
      </div>

      {/* Selection toolbar */}
      {selectionMode && selectedIds.size > 0 && (
        <SelectionToolbar
          selectedIds={selectedIds}
          totalCount={totalCount}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onCancel={handleCancelSelection}
        />
      )}
    </ScrollArea>
  )
}
