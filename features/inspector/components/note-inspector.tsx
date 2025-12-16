'use client'

import { useCurrentNote, useCurrentNoteId } from '@/stores'
import { useBacklinks, useRelatedNotes } from '@/features/notes/hooks'
import { AIToolsSection } from './ai-tools-section'
import { ConflictsSection } from './conflicts-section'
import { RelatedNotesSection } from './related-notes-section'
import { TagsSection } from './tags-section'
import { BacklinksSection } from './backlinks-section'

export function NoteInspector() {
  const currentNote = useCurrentNote()
  const currentNoteId = useCurrentNoteId()

  // Determine if this is a new note
  const isNewNote = currentNoteId === 'new'
  const effectiveNoteId = isNewNote ? null : currentNoteId

  // Get tags from the current note, or empty array for new notes
  const tags = currentNote?.tags ?? []

  // Fetch backlinks for the current note
  const { data: backlinks } = useBacklinks(effectiveNoteId)

  // Fetch semantically related notes
  const {
    data: relatedNotes,
    isLoading: isLoadingRelated,
    isError: isErrorRelated,
  } = useRelatedNotes(effectiveNoteId)

  return (
    <div className="space-y-0">
      {/* AI Tools Section */}
      <AIToolsSection 
        noteId={effectiveNoteId} 
        disabled={isNewNote}
      />

      {/* Conflicts Section */}
      <ConflictsSection noteId={effectiveNoteId} />

      {/* Related Notes Section */}
      <RelatedNotesSection 
        noteId={effectiveNoteId}
        relatedNotes={relatedNotes ?? []}
        isLoading={isLoadingRelated}
        isError={isErrorRelated}
      />

      {/* Tags Section */}
      <TagsSection 
        noteId={effectiveNoteId}
        tags={tags}
      />

      {/* Backlinks Section */}
      <BacklinksSection 
        noteId={effectiveNoteId}
        backlinks={backlinks ?? []}
      />
    </div>
  )
}
