'use client'

import { useCurrentNote, useCurrentNoteId } from '@/stores'
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

  return (
    <div className="space-y-0">
      {/* AI Tools Section */}
      <AIToolsSection 
        noteId={effectiveNoteId} 
        disabled={isNewNote}
      />

      {/* Conflicts Section */}
      <ConflictsSection 
        noteId={effectiveNoteId}
        // Placeholder: conflicts will be fetched via hook later
        conflicts={[]}
      />

      {/* Related Notes Section */}
      <RelatedNotesSection 
        noteId={effectiveNoteId}
        // Placeholder: related notes will be fetched via hook later
        relatedNotes={[]}
      />

      {/* Tags Section */}
      <TagsSection 
        noteId={effectiveNoteId}
        tags={tags}
      />

      {/* Backlinks Section */}
      <BacklinksSection 
        noteId={effectiveNoteId}
        // Placeholder: backlinks will be fetched via hook later
        backlinks={[]}
      />
    </div>
  )
}
