'use client'

import { useState } from 'react'
import { CheckSquare, Square, Trash2, X, Loader2 } from 'lucide-react'
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
import { useBulkDeleteNotes } from '../hooks/use-bulk-delete-notes'
import { useRestoreNote } from '@/features/trash/hooks'
import { useTabsStore } from '@/stores'

interface SelectionToolbarProps {
  selectedIds: Set<string>
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onCancel: () => void
}

export function SelectionToolbar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onCancel,
}: SelectionToolbarProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const bulkDeleteMutation = useBulkDeleteNotes()
  const restoreMutation = useRestoreNote()

  const selectedCount = selectedIds.size
  const allSelected = selectedCount === totalCount && totalCount > 0

  const handleDelete = async () => {
    if (selectedCount === 0) return

    setIsDeleting(true)
    const idsToDelete = Array.from(selectedIds)

    try {
      await bulkDeleteMutation.mutateAsync(idsToDelete)

      // Close tabs for deleted notes
      const tabsState = useTabsStore.getState()
      idsToDelete.forEach((noteId) => {
        const tab = tabsState.tabs.find((t) => t.noteId === noteId)
        if (tab) {
          tabsState.closeTab(tab.id)
        }
      })

      // Show toast with undo option
      toast.success(`${selectedCount} ${selectedCount === 1 ? 'note' : 'notes'} moved to trash`, {
        description: 'You can restore them from the trash.',
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              // Restore all deleted notes
              await Promise.all(idsToDelete.map((id) => restoreMutation.mutateAsync(id)))
              toast.success(`${selectedCount} ${selectedCount === 1 ? 'note' : 'notes'} restored`)
            } catch {
              toast.error('Failed to restore some notes')
            }
          },
        },
        duration: 5000,
      })

      // Exit selection mode
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
                  Delete {selectedCount} {selectedCount === 1 ? 'note' : 'notes'}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedCount === 1
                    ? 'This note will be moved to trash. You can restore it within 30 days.'
                    : `These ${selectedCount} notes will be moved to trash. You can restore them within 30 days.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
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
