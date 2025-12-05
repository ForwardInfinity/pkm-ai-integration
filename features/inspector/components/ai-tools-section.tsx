'use client'

import { Sparkles, MessageSquareWarning, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InspectorSection } from './inspector-section'

interface AIToolsSectionProps {
  noteId: string | null
  disabled?: boolean
}

export function AIToolsSection({ noteId, disabled = false }: AIToolsSectionProps) {
  const isDisabled = disabled || !noteId || noteId === 'new'

  // Placeholder handlers - to be wired up with AI later
  const handleCritiqueNote = () => {
    console.log('Critique note clicked - AI integration coming soon')
    // TODO: Implement AI critique functionality
  }

  const handleCleanNote = () => {
    console.log('Clean note clicked - AI integration coming soon')
    // TODO: Implement AI clean functionality
  }

  return (
    <InspectorSection
      title="AI Tools"
      icon={<Sparkles className="h-4 w-4" />}
      defaultOpen={true}
    >
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleCritiqueNote}
          disabled={isDisabled}
        >
          <MessageSquareWarning className="h-4 w-4" />
          Critique This Note
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
  )
}
