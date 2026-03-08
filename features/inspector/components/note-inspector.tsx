'use client'

import { useCurrentDraft, useCurrentPersistedNoteId } from '@/stores'
import { useBacklinks, useRelatedNotes } from '@/features/notes/hooks'
import { AIToolsSection } from './ai-tools-section'
import { ConflictsSection } from './conflicts-section'
import { RelatedNotesSection } from './related-notes-section'
import { TagsSection } from './tags-section'
import { BacklinksSection } from './backlinks-section'

export function NoteInspector() {
  const currentDraft = useCurrentDraft()
  const effectivePersistedNoteId = useCurrentPersistedNoteId()

  const tags = currentDraft?.tags ?? []

  const { data: backlinks } = useBacklinks(effectivePersistedNoteId)

  const {
    data: relatedNotes,
    isLoading: isLoadingRelated,
    isError: isErrorRelated,
  } = useRelatedNotes(effectivePersistedNoteId)

  return (
    <div className="space-y-0">
      <AIToolsSection noteId={effectivePersistedNoteId} />

      <ConflictsSection noteId={effectivePersistedNoteId} />

      <RelatedNotesSection
        noteId={effectivePersistedNoteId}
        relatedNotes={relatedNotes ?? []}
        isLoading={isLoadingRelated}
        isError={isErrorRelated}
      />

      <TagsSection tags={tags} />

      <BacklinksSection
        noteId={effectivePersistedNoteId}
        backlinks={backlinks ?? []}
      />
    </div>
  )
}
