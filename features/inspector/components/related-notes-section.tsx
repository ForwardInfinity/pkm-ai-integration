'use client'

import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'
import { InspectorSection } from './inspector-section'

interface RelatedNotesSectionProps {
  noteId: string | null
  // Placeholder for related notes data - will be fetched later
  relatedNotes?: Array<{
    id: string
    title: string
    problem: string | null
    similarity: number
  }>
}

export function RelatedNotesSection({ noteId, relatedNotes = [] }: RelatedNotesSectionProps) {
  const hasRelatedNotes = relatedNotes.length > 0

  return (
    <InspectorSection
      title="Related Notes"
      icon={<FileText className="h-4 w-4" />}
      defaultOpen={true}
    >
      {!noteId || noteId === 'new' ? (
        <p className="text-sm text-muted-foreground">
          Save your note to find related content
        </p>
      ) : hasRelatedNotes ? (
        <div className="space-y-1">
          {relatedNotes.map((related) => (
            <Link
              key={related.id}
              href={`/notes/${related.id}`}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
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
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No related notes found
        </p>
      )}
    </InspectorSection>
  )
}
