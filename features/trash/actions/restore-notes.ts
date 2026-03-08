'use server'

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'

export type RestoreNotesResult = {
  success: boolean
  restored: number
  queuedConflictDetections: number
  error?: string
}

function toConflictDetectionEvent(note: {
  id: string
  embedding_status: string
  embedding_content_hash: string | null
}) {
  if (
    note.embedding_status !== 'completed' ||
    !note.embedding_content_hash
  ) {
    return null
  }

  return {
    name: 'note/conflicts.detection.requested' as const,
    data: {
      noteId: note.id,
      contentHash: note.embedding_content_hash,
    },
  }
}

export async function restoreNotes(noteIds: string[]): Promise<RestoreNotesResult> {
  if (noteIds.length === 0) {
    return {
      success: true,
      restored: 0,
      queuedConflictDetections: 0,
    }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notes')
      .update({ deleted_at: null })
      .in('id', noteIds)
      .not('deleted_at', 'is', null)
      .select('id, embedding_status, embedding_content_hash')

    if (error) {
      return {
        success: false,
        restored: 0,
        queuedConflictDetections: 0,
        error: error.message,
      }
    }

    const restoredNotes = data || []
    const events = restoredNotes
      .map(toConflictDetectionEvent)
      .filter((event): event is NonNullable<typeof event> => event !== null)

    if (events.length > 0) {
      await inngest.send(events)
    }

    return {
      success: true,
      restored: restoredNotes.length,
      queuedConflictDetections: events.length,
    }
  } catch (error) {
    console.error('Error restoring notes:', error)
    return {
      success: false,
      restored: 0,
      queuedConflictDetections: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function restoreNote(noteId: string): Promise<RestoreNotesResult> {
  return restoreNotes([noteId])
}
