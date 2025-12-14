import { inngest } from '../client'
import { NonRetriableError } from 'inngest'
import { createClient } from '@supabase/supabase-js'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { embed } from 'ai'
import type { Database } from '@/types/database.types'
import { hashNoteForEmbedding } from '@/lib/embedding'

const MAX_EMBEDDING_CHARS = 8000
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

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
        .select('id, title, problem, content, embedding_content_hash, embedding_status')
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

    // Step 4: Prepare text for embedding
    const rawText = [note.title, note.problem, note.content].filter(Boolean).join('\n\n')
    const textToEmbed = rawText.slice(0, MAX_EMBEDDING_CHARS)

    if (!textToEmbed.trim()) {
      // No content to embed - mark as completed with null embedding
      await step.run('mark-empty-completed', async () => {
        await supabase
          .from('notes')
          .update({
            embedding_status: 'completed',
            embedding_updated_at: new Date().toISOString(),
            embedding_model: EMBEDDING_MODEL,
            embedding: null,
          })
          .eq('id', noteId)
          .eq('embedding_content_hash', expectedHash)
      })
      return { skipped: true, reason: 'No content to embed', noteId }
    }

    // Step 5: Generate embedding
    let embedding: number[]
    try {
      const result = await step.run('generate-embedding', async () => {
        const openrouter = createOpenRouter({ apiKey })

        return embed({
          model: openrouter.textEmbeddingModel(EMBEDDING_MODEL),
          value: textToEmbed,
        })
      })
      embedding = result.embedding
    } catch (error) {
      // Mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await step.run('mark-failed', async () => {
        await supabase
          .from('notes')
          .update({
            embedding_status: 'failed',
            embedding_error: errorMessage,
          })
          .eq('id', noteId)
          .eq('embedding_content_hash', expectedHash)
      })
      throw error // Re-throw for Inngest retry logic
    }

    // Step 6: Store embedding with conditional update
    await step.run('store-embedding', async () => {
      const { error } = await supabase
        .from('notes')
        .update({
          embedding: embedding as unknown as string,
          embedding_status: 'completed',
          embedding_updated_at: new Date().toISOString(),
          embedding_model: EMBEDDING_MODEL,
          embedding_error: null,
        })
        .eq('id', noteId)
        .eq('embedding_content_hash', expectedHash) // Only update if hash still matches

      if (error) {
        throw new Error(`Failed to store embedding: ${error.message}`)
      }
    })

    return { success: true, noteId }
  }
)
