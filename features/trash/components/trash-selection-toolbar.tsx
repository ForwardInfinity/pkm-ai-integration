'use client'

import { useState } from 'react'
import { CheckSquare, Square, Trash2, RotateCcw, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { useBulkRestoreNotes } from '../hooks/use-bulk-restore-notes'
import { useBulkPermanentDelete } from '../hooks/use-bulk-permanent-delete'

interface TrashSelectionToolbarProps {
  selectedIds: Set<string>
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onCancel: () => void
}

export function TrashSelectionToolbar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onCancel,
}: TrashSelectionToolbarProps) {
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const bulkRestoreMutation = useBulkRestoreNotes()
  const bulkDeleteMutation = useBulkPermanentDelete()

  const selectedCount = selectedIds.size
  const allSelected = selectedCount === totalCount && totalCount > 0

  const handleRestore = async () => {
    if (selectedCount === 0) return

    setIsRestoring(true)
    const idsToRestore = Array.from(selectedIds)

    try {
      await bulkRestoreMutation.mutateAsync(idsToRestore)

      toast.success(`${selectedCount} ${selectedCount === 1 ? 'note' : 'notes'} restored`, {
        description: 'Notes have been moved back to your notes list.',
      })

      onCancel()
    } catch {
      toast.error('Failed to restore notes')
    } finally {
      setIsRestoring(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (selectedCount === 0) return

    setIsDeleting(true)
    const idsToDelete = Array.from(selectedIds)

    try {
      await bulkDeleteMutation.mutateAsync(idsToDelete)

      toast.success(`${selectedCount} ${selectedCount === 1 ? 'note' : 'notes'} permanently deleted`)

      onCancel()
    } catch {
      toast.error('Failed to delete notes')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 rounded-xl border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-sm ring-1 ring-border/50">
        <div className="flex items-center gap-2 border-r border-border/50 pr-3">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex items-center gap-1">
          {allSelected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="h-8 gap-1.5 text-xs"
            >
              <Square className="h-3.5 w-3.5" />
              Deselect All
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="h-8 gap-1.5 text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select All
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestore}
            disabled={isRestoring || selectedCount === 0}
            className="h-8 gap-1.5 text-xs"
          >
            {isRestoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Restore
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting || selectedCount === 0}
                className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Permanently delete {selectedCount} {selectedCount === 1 ? 'note' : 'notes'}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected {selectedCount === 1 ? 'note' : 'notes'}.
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

          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 gap-1.5 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
