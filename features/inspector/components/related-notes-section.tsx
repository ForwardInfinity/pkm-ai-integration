'use client'

import { useRouter } from 'next/navigation'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'
import { useTabsActions } from '@/stores'
import { InspectorSection } from './inspector-section'

interface RelatedNotesSectionProps {
  noteId: string | null
  relatedNotes?: Array<{
    id: string
    title: string
    problem: string | null
    similarity: number
  }>
  isLoading?: boolean
}

export function RelatedNotesSection({
  noteId,
  relatedNotes = [],
  isLoading = false,
}: RelatedNotesSectionProps) {
  const router = useRouter()
  const { openTab } = useTabsActions()
  const hasRelatedNotes = relatedNotes.length > 0

  const handleRelatedNoteClick = (note: { id: string; title: string }) => {
    openTab(note.id, note.title || 'Untitled', true)
    router.push(`/notes/${note.id}`)
  }

  return (
    <InspectorSection
      title="Related Notes"
      icon={<FileText className="h-4 w-4" />}
      badge={
        hasRelatedNotes ? (
          <span className="text-xs text-muted-foreground">
            {relatedNotes.length}
          </span>
        ) : null
      }
      defaultOpen={true}
    >
      {!noteId || noteId === 'new' ? (
        <p className="text-sm text-muted-foreground">
          Save your note to find related content
        </p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Finding related notes...</span>
        </div>
      ) : hasRelatedNotes ? (
        <div className="space-y-1">
          {relatedNotes.map((related) => (
            <button
              key={related.id}
              type="button"
              onClick={() => handleRelatedNoteClick(related)}
              className="w-full flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group text-left"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary">
                  {related.title}
                </p>
                {related.problem && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {related.problem}
                  </p>
                )}
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No related notes found</p>
      )}
    </InspectorSection>
  )
}
