'use client'

import { Sparkles, Flame, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InspectorSection } from './inspector-section'
import { useCrucibleActions } from '@/stores'
import { CrucibleDialog } from '@/features/criticism'
import { useCurrentNote } from '@/stores'

interface AIToolsSectionProps {
  noteId: string | null
  disabled?: boolean
}

export function AIToolsSection({ noteId, disabled = false }: AIToolsSectionProps) {
  const isDisabled = disabled || !noteId || noteId === 'new'
  const currentNote = useCurrentNote()
  const { openCrucible } = useCrucibleActions()

  const handleCritiqueNote = () => {
    if (noteId && noteId !== 'new') {
      openCrucible()
    }
  }

  const handleCleanNote = () => {
    console.log('Clean note clicked - AI integration coming soon')
    // TODO: Implement AI clean functionality
  }

  return (
    <>
      <InspectorSection
        title="AI Tools"
        icon={<Sparkles className="h-4 w-4" />}
        defaultOpen={true}
      >
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 hover:border-destructive/50 hover:bg-destructive/5"
            onClick={handleCritiqueNote}
            disabled={isDisabled}
          >
            <Flame className="h-4 w-4 text-destructive" />
            Enter The Crucible
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleCleanNote}
            disabled={isDisabled}
          >
            <Wand2 className="h-4 w-4" />
            Clean Note
          </Button>
          {isDisabled && (
            <p className="text-xs text-muted-foreground mt-2">
              Save your note to enable AI tools
            </p>
          )}
        </div>
      </InspectorSection>

      {/* Crucible Dialog */}
      {currentNote && noteId && noteId !== 'new' && (
        <CrucibleDialog
          noteId={noteId}
          title={currentNote.title ?? ''}
          problem={currentNote.problem ?? null}
          content={currentNote.content ?? ''}
        />
      )}
    </>
  )
}
