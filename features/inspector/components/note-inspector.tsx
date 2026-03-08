'use client'

import { Loader2 } from 'lucide-react'
import { useCurrentDraft, useCurrentPersistedNoteId } from '@/stores'
import { useBacklinks, useRelatedNotes } from '@/features/notes/hooks'
import { useIsNoteAnalysisRefreshing } from '@/lib/note-analysis-refresh'
import { isUnsavedNoteId } from '@/features/notes/utils/note-id'
import { AIToolsSection } from './ai-tools-section'
import { ConflictsSection } from './conflicts-section'
import { RelatedNotesSection } from './related-notes-section'
import { TagsSection } from './tags-section'
import { BacklinksSection } from './backlinks-section'

export function NoteInspector() {
  const currentDraft = useCurrentDraft()
  const persistedNoteId = useCurrentPersistedNoteId()
  const isUnsaved = currentDraft?.isUnsaved ?? isUnsavedNoteId(currentDraft?.id ?? null)
  const effectivePersistedNoteId = isUnsaved ? null : persistedNoteId

  const tags = currentDraft?.tags ?? []
  const isRefreshingAnalysis = useIsNoteAnalysisRefreshing(effectivePersistedNoteId)

  const { data: backlinks } = useBacklinks(effectivePersistedNoteId)

  const {
    data: relatedNotes,
    isLoading: isLoadingRelated,
    isError: isErrorRelated,
  } = useRelatedNotes(effectivePersistedNoteId)

  return (
    <div className="space-y-0">
      <AIToolsSection noteId={effectivePersistedNoteId} disabled={isUnsaved} />

      {isRefreshingAnalysis ? (
        <div className="px-3 py-2 flex items-center gap-2 border-b text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Refreshing analysis...</span>
        </div>
      ) : null}

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
