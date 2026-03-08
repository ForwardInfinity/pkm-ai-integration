'use client'

import { Sparkles, MessageSquareWarning, Loader2, AlertCircle, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCurrentDraft } from '@/stores'
import { useCritiqueNote } from '@/features/ai/hooks/use-critique-note'
import { isUnsavedNoteId } from '@/features/notes/utils/note-id'
import { InspectorSection } from './inspector-section'
import { cn } from '@/lib/utils'

interface AIToolsSectionProps {
  noteId: string | null
  disabled?: boolean
}

interface CritiqueCategoryProps {
  title: string
  items: string[]
  defaultOpen?: boolean
}

function CritiqueCategory({ title, items, defaultOpen = true }: CritiqueCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (items.length === 0) return null

  return (
    <div className="border-l-2 border-muted pl-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground w-full text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        {title}
        <span className="text-xs ml-1">({items.length})</span>
      </button>
      {isOpen && (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="text-sm text-foreground/90 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AIToolsSection({ noteId, disabled = false }: AIToolsSectionProps) {
  const currentDraft = useCurrentDraft()
  const { isLoading, error, result, critique, dismiss } = useCritiqueNote()

  const isUnsaved = isUnsavedNoteId(noteId)
  const isDisabled = disabled || isUnsaved

  useEffect(() => {
    if (isUnsaved) {
      dismiss()
    }
  }, [dismiss, isUnsaved])

  const handleCritiqueNote = () => {
    if (!currentDraft) return
    critique(
      currentDraft.title,
      currentDraft.problem,
      currentDraft.content
    )
  }

  const hasResults = result && (
    result.counterarguments.length > 0 ||
    result.weakLinks.length > 0 ||
    result.hiddenAssumptions.length > 0 ||
    result.blindspots.length > 0
  )

  const totalCritiques = result
    ? result.counterarguments.length +
      result.weakLinks.length +
      result.hiddenAssumptions.length +
      result.blindspots.length
    : 0

  return (
    <InspectorSection
      title="AI Tools"
      icon={<Sparkles className="h-4 w-4" />}
      defaultOpen={true}
    >
      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start gap-2",
            isLoading && "opacity-70"
          )}
          onClick={handleCritiqueNote}
          disabled={isDisabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquareWarning className="h-4 w-4" />
          )}
          {isLoading ? 'Critiquing...' : 'Critique This Note'}
        </Button>

        {isDisabled && !isLoading && !result && !error && (
          <p className="text-xs text-muted-foreground">
            Save your note to critique it with AI
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{error}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 hover:bg-destructive/20"
              onClick={dismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {result && !hasResults && (
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-sm text-muted-foreground">
              No significant criticisms found. Your note appears well-reasoned!
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={dismiss}
            >
              Dismiss
            </Button>
          </div>
        )}

        {hasResults && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Found {totalCritiques} critique{totalCritiques !== 1 ? 's' : ''}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={dismiss}
              >
                Clear
              </Button>
            </div>

            <div className="space-y-4">
              <CritiqueCategory
                title="Counterarguments"
                items={result.counterarguments}
              />
              <CritiqueCategory
                title="Weak Links"
                items={result.weakLinks}
              />
              <CritiqueCategory
                title="Hidden Assumptions"
                items={result.hiddenAssumptions}
              />
              <CritiqueCategory
                title="Blindspots"
                items={result.blindspots}
              />
            </div>
          </div>
        )}
      </div>
    </InspectorSection>
  )
}
