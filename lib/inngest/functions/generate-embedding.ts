import { inngest } from '../client'
import { NonRetriableError } from 'inngest'
import { createClient } from '@supabase/supabase-js'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { embedMany } from 'ai'
import type { Database } from '@/types/database.types'
import { hashNoteForEmbedding, chunkText, meanPoolEmbeddings } from '@/lib/embedding'

const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

// Chunking configuration
const CHUNK_SIZE_CHARS = 2000
const CHUNK_OVERLAP_CHARS = 200

export const generateNoteEmbedding = inngest.createFunction(
  {
    id: 'generate-note-embedding',
    name: 'Generate Note Embedding',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'note/embedding.requested' },
  async ({ event, step }) => {
    const { noteId, expectedHash } = event.data

    // Validate environment variables early (fail fast, no retries for config errors)
    const apiKey = process.env.OPENROUTER_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!apiKey) {
      throw new NonRetriableError('OPENROUTER_API_KEY environment variable is not set')
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new NonRetriableError('Missing Supabase environment variables')
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    // Step 1: Fetch latest note data and verify hash
    const noteData = await step.run('fetch-note-data', async () => {
      const { data: note, error } = await supabase
        .from('notes')
        .select('id, user_id, title, problem, content, embedding_content_hash, embedding_status')
        .eq('id', noteId)
        .single()

      if (error || !note) {
        throw new NonRetriableError(`Note not found: ${noteId}`)
      }

      // Compute current hash from fetched data
      const currentHash = hashNoteForEmbedding({
        title: note.title,
        problem: note.problem,
        content: note.content,
      })

      return { note, currentHash }
    })

    const { note, currentHash } = noteData

    // Step 2: Check for stale event (content changed since event was sent)
    if (currentHash !== expectedHash) {
      return {
        skipped: true,
        reason: 'Content changed since event was sent (hash mismatch)',
        noteId,
        expectedHash,
        currentHash,
      }
    }

    // Step 3: Mark as processing with conditional update
    const processingResult = await step.run('mark-processing', async () => {
      const { data, error } = await supabase
        .from('notes')
        .update({ embedding_status: 'processing' })
        .eq('id', noteId)
        .eq('embedding_content_hash', expectedHash) // Conditional on hash match
        .select('id')
        .single()

      if (error || !data) {
        // Another process may have updated the note
        return { updated: false }
      }
      return { updated: true }
    })

    if (!processingResult.updated) {
      return {
        skipped: true,
        reason: 'Could not mark as processing (hash changed or note modified)',
        noteId,
      }
    }

    // Step 4: Prepare text and create chunks
    const rawText = [note.title, note.problem, note.content].filter(Boolean).join('\n\n')
    const chunks = chunkText(rawText, {
      chunkSizeChars: CHUNK_SIZE_CHARS,
      overlapChars: CHUNK_OVERLAP_CHARS,
    })

    if (chunks.length === 0) {
      // No content to embed - mark as completed with null embedding and clear chunks
      await step.run('mark-empty-completed', async () => {
        // Delete any existing chunks
        await supabase.from('note_chunks').delete().eq('note_id', noteId)

        const { data, error } = await supabase
          .from('notes')
          .update({
            embedding_status: 'completed',
            embedding_updated_at: new Date().toISOString(),
            embedding_model: EMBEDDING_MODEL,
            embedding: null,
          })
          .eq('id', noteId)
          .eq('embedding_content_hash', expectedHash)
          .select('id')
          .maybeSingle()

        if (error) {
          throw new Error(`Failed to mark empty note as completed: ${error.message}`)
        }
        // Zero-row update is acceptable here - hash changed, will be reprocessed
        if (!data) {
          console.warn(`[Embedding] Hash changed before marking empty note ${noteId} as completed`)
        }
      })
      return { skipped: true, reason: 'No content to embed', noteId }
    }

    // Step 5: Generate embeddings for all chunks
    let embeddings: number[][]
    try {
      const result = await step.run('generate-embeddings', async () => {
        const openrouter = createOpenRouter({ apiKey })

        return embedMany({
          model: openrouter.textEmbeddingModel(EMBEDDING_MODEL),
          values: chunks.map((c) => c.text),
          maxRetries: 0, // Let Inngest manage retries centrally
        })
      })
      embeddings = result.embeddings
    } catch (error) {
      // Mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await step.run('mark-failed', async () => {
        const { error: updateError } = await supabase
          .from('notes')
          .update({
            embedding_status: 'failed',
            embedding_error: errorMessage,
          })
          .eq('id', noteId)
          .eq('embedding_content_hash', expectedHash)

        if (updateError) {
          console.error(`[Embedding] Failed to mark note ${noteId} as failed: ${updateError.message}`)
        }
        // Zero-row update is acceptable - hash changed, will be reprocessed
      })
      throw error // Re-throw for Inngest retry logic
    }

    // Step 6: Store chunks with embeddings (conditional on hash match)
    const chunksStored = await step.run('store-chunks', async (): Promise<{
      stored: boolean
      reason?: string
      chunkCount?: number
    }> => {
      // Verify hash hasn't changed before modifying chunks
      const { data: currentNote } = await supabase
        .from('notes')
        .select('embedding_content_hash')
        .eq('id', noteId)
        .single()

      if (currentNote?.embedding_content_hash !== expectedHash) {
        return { stored: false, reason: 'Hash changed during processing' }
      }

      // Delete existing chunks
      const { error: deleteError } = await supabase
        .from('note_chunks')
        .delete()
        .eq('note_id', noteId)

      if (deleteError) {
        throw new Error(`Failed to delete old chunks: ${deleteError.message}`)
      }

      // Insert new chunks
      const chunkRows = chunks.map((chunk, i) => ({
        note_id: noteId,
        user_id: note.user_id,
        chunk_index: chunk.index,
        content_start: chunk.start,
        content_end: chunk.end,
        text_chunk: chunk.text,
        embedding: embeddings[i] as unknown as string, // Cast for Supabase vector type
      }))

      const { error: insertError } = await supabase.from('note_chunks').insert(chunkRows)

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`)
      }

      return { stored: true, chunkCount: chunks.length }
    })

    if (!chunksStored.stored) {
      return {
        skipped: true,
        reason: chunksStored.reason || 'Failed to store chunks',
        noteId,
      }
    }

    // Step 7: Compute aggregate embedding and store on note
    const aggregateResult = await step.run('store-aggregate-embedding', async () => {
      // Compute mean pooling of all chunk embeddings
      const aggregateEmbedding = meanPoolEmbeddings(embeddings)

      const { data, error } = await supabase
        .from('notes')
        .update({
          embedding: aggregateEmbedding as unknown as string,
          embedding_status: 'completed',
          embedding_updated_at: new Date().toISOString(),
          embedding_model: EMBEDDING_MODEL,
          embedding_error: null,
        })
        .eq('id', noteId)
        .eq('embedding_content_hash', expectedHash) // Only update if hash still matches
        .select('id')
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to store aggregate embedding: ${error.message}`)
      }
      if (!data) {
        // Zero rows updated - hash changed during processing
        // Chunks are already stored, but note won't be marked complete
        // Log but don't throw - reconciler handles this case
        console.warn(`[Embedding] Hash changed before final update for note ${noteId}`)
        return { updated: false }
      }
      return { updated: true }
    })

    if (!aggregateResult.updated) {
      return {
        skipped: true,
        reason: 'Hash changed before storing aggregate embedding',
        noteId,
      }
    }

    await step.sendEvent('emit-embedding-completed', {
      id: `note-embedding.completed:${noteId}:${expectedHash}`,
      name: 'note/embedding.completed',
      data: {
        noteId,
        contentHash: expectedHash,
      },
    })

    return {
      success: true,
      noteId,
      chunkCount: chunks.length,
    }
  }
)
