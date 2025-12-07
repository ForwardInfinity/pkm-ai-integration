'use client'

import { useState } from 'react'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useTrashNotes, useEmptyTrash } from '../hooks'
import { TrashListItem } from './trash-list-item'
import { TrashEmptyState } from './trash-empty-state'

export function TrashList() {
  const { data: notes, isLoading, error } = useTrashNotes()
  const emptyTrashMutation = useEmptyTrash()
  const [isEmptying, setIsEmptying] = useState(false)

  const handleEmptyTrash = async () => {
    setIsEmptying(true)
    try {
      await emptyTrashMutation.mutateAsync()
      toast.success('Trash emptied', {
        description: 'All notes have been permanently deleted.',
      })
    } catch {
      toast.error('Failed to empty trash')
    } finally {
      setIsEmptying(false)
    }
  }

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
          <p className="text-sm font-medium text-muted-foreground">Loading trash...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-destructive/5 px-4 py-16">
        <div className="rounded-2xl bg-background p-8 text-center shadow-sm ring-1 ring-destructive/20">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Unable to load trash</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Please check your connection and try again
          </p>
        </div>
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return <TrashEmptyState />
  }

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/10">
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-6 py-5 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 ring-1 ring-border/50">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    Trash
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'} · Auto-deleted after 30 days
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEmptying}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                  >
                    {isEmptying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Empty Trash
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Empty trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {notes.length}{' '}
                      {notes.length === 1 ? 'note' : 'notes'} in trash. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEmptyTrash}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Empty trash
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-12">
          <div className="grid gap-3">
            {notes.map((note, index) => (
              <div
                key={note.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TrashListItem note={note} />
              </div>
            ))}
          </div>
          <div className="h-8" />
        </main>
      </div>
    </ScrollArea>
  )
}
