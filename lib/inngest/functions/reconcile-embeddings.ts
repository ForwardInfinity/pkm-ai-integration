import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { hashNoteForEmbedding } from '@/lib/embedding'

const BATCH_LIMIT = 50
const STALE_THRESHOLD_MINUTES = 5

export const reconcileEmbeddings = inngest.createFunction(
  {
    id: 'reconcile-embeddings',
    name: 'Reconcile Stale Embeddings',
  },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - STALE_THRESHOLD_MINUTES)

    // Step 1: Find notes needing embedding reconciliation
    const notesToReconcile = await step.run('find-stale-notes', async () => {
      // Query 1: Stale pending/failed notes
      const { data: staleNotes, error: staleError } = await supabase
        .from('notes')
        .select('id, title, problem, content')
        .in('embedding_status', ['pending', 'failed'])
        .lt('embedding_requested_at', cutoffTime.toISOString())
        .is('deleted_at', null)
        .limit(BATCH_LIMIT)

      if (staleError) {
        throw new Error(`Failed to fetch stale notes: ${staleError.message}`)
      }

      // Query 2: Legacy notes (completed but no hash - need hash backfill)
      let remainingLimit = BATCH_LIMIT - (staleNotes?.length || 0)
      let legacyNotes: typeof staleNotes = []

      if (remainingLimit > 0) {
        const { data, error: legacyError } = await supabase
          .from('notes')
          .select('id, title, problem, content')
          .eq('embedding_status', 'completed')
          .is('embedding_content_hash', null)
          .not('embedding', 'is', null)
          .is('deleted_at', null)
          .limit(remainingLimit)

        if (legacyError) {
          throw new Error(`Failed to fetch legacy notes: ${legacyError.message}`)
        }

        legacyNotes = data || []
      }

      // Query 3: Notes with embedding but no chunks (need chunk backfill)
      remainingLimit = BATCH_LIMIT - (staleNotes?.length || 0) - legacyNotes.length
      let missingChunksNotes: typeof staleNotes = []

      if (remainingLimit > 0) {
        // Find notes that have an embedding but no chunks
        const { data, error: chunksError } = await supabase
          .from('notes')
          .select('id, title, problem, content')
          .eq('embedding_status', 'completed')
          .not('embedding', 'is', null)
          .is('deleted_at', null)
          .limit(remainingLimit * 2) // Fetch more since we'll filter

        if (chunksError) {
          throw new Error(`Failed to fetch notes for chunk backfill: ${chunksError.message}`)
        }

        if (data && data.length > 0) {
          // Check which notes have no chunks
          const noteIds = data.map((n) => n.id)
          const { data: existingChunks, error: chunkCheckError } = await supabase
            .from('note_chunks')
            .select('note_id')
            .in('note_id', noteIds)

          if (chunkCheckError) {
            throw new Error(`Failed to check existing chunks: ${chunkCheckError.message}`)
          }

          const notesWithChunks = new Set(existingChunks?.map((c) => c.note_id) || [])
          missingChunksNotes = data
            .filter((n) => !notesWithChunks.has(n.id))
            .slice(0, remainingLimit)
        }
      }

      return [...(staleNotes || []), ...legacyNotes, ...missingChunksNotes]
    })

    if (notesToReconcile.length === 0) {
      return { reconciled: 0, message: 'No notes need reconciliation' }
    }

    // Step 2: Prepare events with computed hashes
    const events = await step.run('prepare-events', async () => {
      return notesToReconcile.map((note) => ({
        name: 'note/embedding.requested' as const,
        data: {
          noteId: note.id,
          expectedHash: hashNoteForEmbedding({
            title: note.title,
            problem: note.problem,
            content: note.content,
          }),
        },
      }))
    })

    // Step 3: Update notes to mark them as pending with new request time
    await step.run('update-note-status', async () => {
      for (const note of notesToReconcile) {
        const hash = hashNoteForEmbedding({
          title: note.title,
          problem: note.problem,
          content: note.content,
        })

        await supabase
          .from('notes')
          .update({
            embedding_status: 'pending',
            embedding_requested_at: new Date().toISOString(),
            embedding_content_hash: hash,
            embedding_error: null,
          })
          .eq('id', note.id)
      }
    })

    // Step 4: Send all events
    await step.run('send-events', async () => {
      await inngest.send(events)
    })

    return {
      reconciled: notesToReconcile.length,
      message: `Sent embedding events for ${notesToReconcile.length} notes`,
    }
  }
)
