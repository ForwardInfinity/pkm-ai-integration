'use client'

import Link from 'next/link'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { InspectorSection } from './inspector-section'

interface ConflictsSectionProps {
  noteId: string | null
  // Placeholder for conflicts data - will be fetched later
  conflicts?: Array<{
    id: string
    explanation: string
    otherNoteId: string
    otherNoteTitle: string
  }>
}

export function ConflictsSection({ noteId, conflicts = [] }: ConflictsSectionProps) {
  const hasConflicts = conflicts.length > 0

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
      ) : hasConflicts ? (
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <Link
              key={conflict.id}
              href={`/conflicts?highlight=${conflict.id}`}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary">
                  {conflict.otherNoteTitle}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {conflict.explanation}
                </p>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
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
