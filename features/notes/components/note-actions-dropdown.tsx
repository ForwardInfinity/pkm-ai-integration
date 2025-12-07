'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pin, PinOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteNote, useUpdateNote } from '../hooks'
import { useRestoreNote } from '@/features/trash/hooks'
import { useTabsStore } from '@/stores'

interface NoteActionsDropdownProps {
  noteId: string
  title: string
  isPinned: boolean
}

export function NoteActionsDropdown({
  noteId,
  title,
  isPinned,
}: NoteActionsDropdownProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteMutation = useDeleteNote()
  const updateMutation = useUpdateNote()
  const restoreMutation = useRestoreNote()

  const handleTogglePin = async () => {
    try {
      await updateMutation.mutateAsync({
        id: noteId,
        is_pinned: !isPinned,
      })
      toast.success(isPinned ? 'Note unpinned' : 'Note pinned')
    } catch {
      toast.error('Failed to update note')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(noteId)

      // Close the tab for this note
      const tabsState = useTabsStore.getState()
      const tab = tabsState.tabs.find((t) => t.noteId === noteId)
      if (tab) {
        tabsState.closeTab(tab.id)
      }

      // Navigate to notes list
      router.push('/notes')

      // Show toast with undo option
      toast.success('Note moved to trash', {
        description: `"${title || 'Untitled'}" can be restored from trash.`,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await restoreMutation.mutateAsync(noteId)
              toast.success('Note restored')
            } catch {
              toast.error('Failed to restore note')
            }
          },
        },
        duration: 5000,
      })
    } catch {
      toast.error('Failed to delete note')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={isDeleting}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleTogglePin}>
          {isPinned ? (
            <>
              <PinOff className="mr-2 h-4 w-4" />
              Unpin note
            </>
          ) : (
            <>
              <Pin className="mr-2 h-4 w-4" />
              Pin note
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
