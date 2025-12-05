'use client'

import Link from 'next/link'
import { Link2, ExternalLink } from 'lucide-react'
import { InspectorSection } from './inspector-section'

interface BacklinksSectionProps {
  noteId: string | null
  // Placeholder for backlinks data - will be fetched later
  backlinks?: Array<{
    id: string
    title: string
    problem: string | null
  }>
}

export function BacklinksSection({ noteId, backlinks = [] }: BacklinksSectionProps) {
  const hasBacklinks = backlinks.length > 0

  return (
    <InspectorSection
      title="Backlinks"
      icon={<Link2 className="h-4 w-4" />}
      badge={
        hasBacklinks ? (
          <span className="text-xs text-muted-foreground">
            {backlinks.length}
          </span>
        ) : null
      }
      defaultOpen={false}
    >
      {!noteId || noteId === 'new' ? (
        <p className="text-sm text-muted-foreground">
          Save your note to see backlinks
        </p>
      ) : hasBacklinks ? (
        <div className="space-y-1">
          {backlinks.map((backlink) => (
            <Link
              key={backlink.id}
              href={`/notes/${backlink.id}`}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary">
                  {backlink.title}
                </p>
                {backlink.problem && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {backlink.problem}
                  </p>
                )}
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No notes link to this one
        </p>
      )}
    </InspectorSection>
  )
}
