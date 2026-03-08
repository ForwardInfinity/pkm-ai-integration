'use server'

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'
import {
  computePairHash,
  getCanonicalPairIds,
} from '@/lib/inngest/functions/conflict-pair-utils'

const CONFIDENCE_THRESHOLD = 0.7

export type RestoreNotesResult = {
  success: boolean
  restored: number
  rehydratedConflicts: number
  queuedConflictDetections: number
  error?: string
}

type RestoredNote = {
  id: string
  user_id: string
  embedding_status: string
  embedding_content_hash: string | null
}

function toConflictDetectionEvent(note: RestoredNote) {
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

/**
 * Recreate active conflicts from prior judgments that were deleted on soft-delete.
 *
 * When a note is trashed, the `on_note_soft_delete` trigger removes its active
 * conflicts. However, the judgment records in `conflict_judgments` persist. On
 * restore, the conflict detector would skip these pairs ("already judged"),
 * leaving the conflicts permanently lost.
 *
 * This function bridges that gap by finding prior judgments that still match the
 * current content and recreating the corresponding conflict rows.
 */
async function rehydrateConflictsFromJudgments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restoredNotes: RestoredNote[]
): Promise<number> {
  const eligibleNotes = restoredNotes.filter(
    (n) => n.embedding_status === 'completed' && n.embedding_content_hash
  )
  if (eligibleNotes.length === 0) return 0

  const rehydratedPairs = new Set<string>()

  for (const note of eligibleNotes) {
    // Find prior tension/contradiction judgments involving this note
    const { data: judgments, error: judgmentError } = await supabase
      .from('conflict_judgments')
      .select(
        'note_a_id, note_b_id, pair_content_hash, judgment_result, confidence, explanation, reasoning'
      )
      .or(`note_a_id.eq.${note.id},note_b_id.eq.${note.id}`)
      .in('judgment_result', ['tension', 'contradiction'])
      .gte('confidence', CONFIDENCE_THRESHOLD)

    if (judgmentError || !judgments?.length) continue

    // Fetch current state of the partner notes
    const otherNoteIds = [
      ...new Set(
        judgments.map((j) =>
          j.note_a_id === note.id ? j.note_b_id : j.note_a_id
        )
      ),
    ]

    const { data: otherNotes } = await supabase
      .from('notes')
      .select('id, embedding_content_hash')
      .in('id', otherNoteIds)
      .is('deleted_at', null)
      .eq('embedding_status', 'completed')

    if (!otherNotes?.length) continue

    const otherNotesMap = new Map(otherNotes.map((n) => [n.id, n]))

    for (const judgment of judgments) {
      const otherNoteId =
        judgment.note_a_id === note.id
          ? judgment.note_b_id
          : judgment.note_a_id
      const otherNote = otherNotesMap.get(otherNoteId)
      if (!otherNote?.embedding_content_hash) continue

      // Verify the judgment is still valid for the current content
      const currentPairHash = computePairHash(
        note.embedding_content_hash!,
        otherNote.embedding_content_hash,
        note.id,
        otherNote.id
      )

      if (currentPairHash !== judgment.pair_content_hash) continue

      const [noteAId, noteBId] = getCanonicalPairIds(note.id, otherNote.id)
      const pairKey = `${noteAId}:${noteBId}`
      if (rehydratedPairs.has(pairKey)) continue

      const { data: existingConflicts, error: existingConflictError } = await supabase
        .from('conflicts')
        .select('status, pair_content_hash')
        .eq('note_a_id', noteAId)
        .eq('note_b_id', noteBId)

      if (existingConflictError) {
        console.warn(
          `Failed to inspect existing conflict projection for pair (${noteAId}, ${noteBId}): ${existingConflictError.message}`
        )
        continue
      }

      const existingConflict = existingConflicts?.[0]
      const dismissalStillApplies =
        existingConflict?.status === 'dismissed' &&
        existingConflict.pair_content_hash === currentPairHash

      if (dismissalStillApplies) continue

      const { error: conflictError } = await supabase
        .from('conflicts')
        .upsert(
          {
            user_id: note.user_id,
            note_a_id: noteAId,
            note_b_id: noteBId,
            pair_content_hash: currentPairHash,
            explanation: judgment.explanation || judgment.reasoning,
            conflict_type: judgment.judgment_result as
              | 'tension'
              | 'contradiction',
            status: 'active',
          },
          { onConflict: 'note_a_id,note_b_id' }
        )

      if (conflictError) {
        console.warn(
          `Failed to rehydrate conflict projection for pair (${noteAId}, ${noteBId}): ${conflictError.message}`
        )
      } else {
        rehydratedPairs.add(pairKey)
      }
    }
  }

  return rehydratedPairs.size
}

export async function restoreNotes(noteIds: string[]): Promise<RestoreNotesResult> {
  if (noteIds.length === 0) {
    return {
      success: true,
      restored: 0,
      rehydratedConflicts: 0,
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
      .select('id, user_id, embedding_status, embedding_content_hash')

    if (error) {
      return {
        success: false,
        restored: 0,
        rehydratedConflicts: 0,
        queuedConflictDetections: 0,
        error: error.message,
      }
    }

    const restoredNotes = data || []

    // Rehydrate conflicts from prior judgments (fixes gap where soft-delete
    // removed the conflict row but the judgment record persists, causing
    // the detector to skip the pair on re-detection)
    const rehydratedConflicts = await rehydrateConflictsFromJudgments(
      supabase,
      restoredNotes
    )

    // Queue detection for any NEW potential conflicts (pairs not yet judged)
    const events = restoredNotes
      .map(toConflictDetectionEvent)
      .filter((event): event is NonNullable<typeof event> => event !== null)

    if (events.length > 0) {
      await inngest.send(events)
    }

    return {
      success: true,
      restored: restoredNotes.length,
      rehydratedConflicts,
      queuedConflictDetections: events.length,
    }
  } catch (error) {
    console.error('Error restoring notes:', error)
    return {
      success: false,
      restored: 0,
      rehydratedConflicts: 0,
      queuedConflictDetections: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function restoreNote(noteId: string): Promise<RestoreNotesResult> {
  return restoreNotes([noteId])
}
