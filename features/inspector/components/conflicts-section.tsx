'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNoteConflicts, useDismissConflict } from '@/features/conflicts'
import { useTabsActions } from '@/stores'
import { InspectorSection } from './inspector-section'

interface ConflictsSectionProps {
  noteId: string | null
}

export function ConflictsSection({ noteId }: ConflictsSectionProps) {
  const router = useRouter()
  const { openTab } = useTabsActions()
  const { data: conflicts = [], isLoading, isError } = useNoteConflicts(noteId)
  const dismissMutation = useDismissConflict()

  const hasConflicts = conflicts.length > 0

  const handleNavigateToNote = (otherNoteId: string, otherNoteTitle: string) => {
    openTab(otherNoteId, otherNoteTitle || 'Untitled', true)
    router.push(`/notes/${otherNoteId}`)
  }

  const handleDismiss = async (conflictId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await dismissMutation.mutateAsync(conflictId)
      toast.success('Conflict dismissed')
    } catch {
      toast.error('Failed to dismiss conflict')
    }
  }

  return (
    <InspectorSection
      title="Conflicts"
      icon={<AlertTriangle className="h-4 w-4" />}
      badge={
        hasConflicts ? (
          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
            {conflicts.length}
          </Badge>
        ) : null
      }
      defaultOpen={true}
    >
      {!noteId || noteId === 'new' ? (
        <p className="text-sm text-muted-foreground">
          Save your note to check for conflicts
        </p>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load conflicts</span>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking for conflicts...</span>
        </div>
      ) : hasConflicts ? (
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <button
                type="button"
                onClick={() => handleNavigateToNote(conflict.otherNoteId, conflict.otherNoteTitle)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium truncate group-hover:text-primary">
                  {conflict.otherNoteTitle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {conflict.explanation}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDismiss(conflict.id, e)}
                disabled={dismissMutation.isPending}
                aria-label="Dismiss conflict"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No conflicts detected
        </p>
      )}
    </InspectorSection>
  )
}
