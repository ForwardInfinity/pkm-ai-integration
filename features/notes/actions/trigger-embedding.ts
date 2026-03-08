'use server'

import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'
import { hashNoteForEmbedding } from '@/lib/embedding'

export type TriggerEmbeddingResult = {
  success: boolean
  skipped?: boolean
  reason?: string
  error?: string
}

export async function triggerEmbeddingGeneration(note: {
  id: string
  title: string
  problem: string | null
  content: string
}): Promise<TriggerEmbeddingResult> {
  try {
    const supabase = await createClient()

    // Compute expected content hash
    const expectedHash = hashNoteForEmbedding(note)

    // Optional optimization: check if already completed with same hash
    const { data: existingNote, error: existingNoteError } = await supabase
      .from('notes')
      .select('deleted_at, embedding_content_hash, embedding_status')
      .eq('id', note.id)
      .single()

    if (existingNoteError) {
      console.error('[Embedding] Failed to fetch note state:', existingNoteError.message)
      return {
        success: false,
        error: `Failed to fetch note state: ${existingNoteError.message}`,
      }
    }

    if (existingNote?.deleted_at) {
      return { success: true, skipped: true, reason: 'Note is trashed' }
    }

    if (
      existingNote?.embedding_status === 'completed' &&
      existingNote?.embedding_content_hash === expectedHash
    ) {
      return { success: true, skipped: true, reason: 'Embedding already up-to-date' }
    }

    // Update note: set status to pending, store expected hash
    const { data: queuedNote, error: updateError } = await supabase
      .from('notes')
      .update({
        embedding_status: 'pending',
        embedding_requested_at: new Date().toISOString(),
        embedding_content_hash: expectedHash,
        embedding_error: null,
      })
      .eq('id', note.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error('[Embedding] Failed to update note status:', updateError.message)
      return { success: false, error: `Failed to update note status: ${updateError.message}` }
    }

    if (!queuedNote) {
      return { success: true, skipped: true, reason: 'Note is trashed' }
    }

    // Send event with noteId and expectedHash only (no content)
    await inngest.send({
      id: `note-embedding:${note.id}:${expectedHash}`,
      name: 'note/embedding.requested',
      data: {
        noteId: note.id,
        expectedHash,
      },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Inngest] Failed to send embedding event:', message)
    return { success: false, error: message }
  }
}
