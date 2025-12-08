'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface NoteContent {
  title: string
  problem: string
  content: string
}

interface CleanNotePreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  original: NoteContent
  cleaned: NoteContent
}

function NotePreviewColumn({
  label,
  note,
  variant,
}: {
  label: string
  note: NoteContent
  variant: 'original' | 'cleaned'
}) {
  return (
    <div className="flex flex-col h-full min-w-0">
      <div
        className={cn(
          'px-4 py-2 border-b text-xs font-medium uppercase tracking-wide',
          variant === 'original'
            ? 'bg-muted/30 text-muted-foreground'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
        )}
      >
        {label}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold leading-tight">
              {note.title || <span className="text-muted-foreground/40 italic">Untitled</span>}
            </h2>
          </div>

          {/* Problem */}
          {note.problem && (
            <div className="text-base text-muted-foreground border-b border-border/40 pb-3">
              {note.problem}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
            {note.content || (
              <span className="text-muted-foreground/40 italic">No content</span>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export function CleanNotePreviewModal({
  open,
  onOpenChange,
  original,
  cleaned,
}: CleanNotePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Compare Versions</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Original column */}
          <div className="flex-1 min-h-0 border-b md:border-b-0 md:border-r border-border">
            <NotePreviewColumn label="Original" note={original} variant="original" />
          </div>

          {/* Cleaned column */}
          <div className="flex-1 min-h-0">
            <NotePreviewColumn label="Cleaned" note={cleaned} variant="cleaned" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
