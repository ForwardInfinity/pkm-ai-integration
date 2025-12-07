'use client'

import { useState } from 'react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { RotateCcw, Trash2, Clock, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
import { useRestoreNote, usePermanentDeleteNote } from '../hooks'
import type { TrashNoteItem } from '../types'

interface TrashListItemProps {
  note: TrashNoteItem
}

export function TrashListItem({ note }: TrashListItemProps) {
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const restoreMutation = useRestoreNote()
  const deleteMutation = usePermanentDeleteNote()

  const deletedAt = new Date(note.deleted_at)
  const daysRemaining = 30 - differenceInDays(new Date(), deletedAt)
  const formattedDate = formatDistanceToNow(deletedAt, { addSuffix: true })

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      await restoreMutation.mutateAsync(note.id)
      toast.success('Note restored', {
        description: `"${note.title}" has been moved back to your notes.`,
      })
    } catch {
      toast.error('Failed to restore note')
    } finally {
      setIsRestoring(false)
    }
  }

  const handlePermanentDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(note.id)
      toast.success('Note permanently deleted')
    } catch {
      toast.error('Failed to delete note')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card/50 p-5 transition-all duration-200',
        'hover:bg-card hover:shadow-md hover:shadow-black/[0.03] hover:border-border/80',
        'dark:hover:shadow-black/20'
      )}
    >
      <div className="relative flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
          <FileText className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-medium leading-tight tracking-tight text-foreground">
                {note.title || 'Untitled'}
              </h3>

              {note.problem && (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/80">
                  {note.problem}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Clock className="h-3 w-3" />
              <span className="text-[11px] font-medium">
                Deleted {formattedDate}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  daysRemaining <= 7 && 'text-amber-600 dark:text-amber-400'
                )}
              >
                {daysRemaining > 0
                  ? `${daysRemaining} days remaining`
                  : 'Expires today'}
              </span>
            </div>

            <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                disabled={isRestoring}
                className="h-8 gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete note?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &ldquo;{note.title || 'Untitled'}&rdquo;.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePermanentDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
