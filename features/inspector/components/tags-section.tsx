'use client'

import { useRouter } from 'next/navigation'
import { Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { InspectorSection } from './inspector-section'

interface TagsSectionProps {
  tags: string[]
  noteId: string | null
}

export function TagsSection({ tags, noteId }: TagsSectionProps) {
  const router = useRouter()
  const hasTags = tags.length > 0

  const handleTagClick = (tag: string) => {
    router.push(`/notes?tag=${encodeURIComponent(tag)}`)
  }

  return (
    <InspectorSection
      title="Tags"
      icon={<Tag className="h-4 w-4" />}
      badge={
        hasTags ? (
          <span className="text-xs text-muted-foreground">
            {tags.length}
          </span>
        ) : null
      }
      defaultOpen={true}
    >
      {!noteId || noteId === 'new' ? (
        <p className="text-sm text-muted-foreground">
          Save your note to add tags
        </p>
      ) : hasTags ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-primary/20 hover:text-primary hover:scale-105 transition-all duration-150"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No tags added
        </p>
      )}
    </InspectorSection>
  )
}
