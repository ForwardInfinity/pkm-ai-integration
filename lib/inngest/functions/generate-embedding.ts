import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { embed } from 'ai'
import type { Database } from '@/types/database.types'

const MAX_EMBEDDING_CHARS = 8000

export const generateNoteEmbedding = inngest.createFunction(
  {
    id: 'generate-note-embedding',
    name: 'Generate Note Embedding',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'note/embedding.requested' },
  async ({ event, step }) => {
    const { noteId, content, title, problem } = event.data

    const rawText = [title, problem, content].filter(Boolean).join('\n\n')
    const textToEmbed = rawText.slice(0, MAX_EMBEDDING_CHARS)

    if (!textToEmbed.trim()) {
      return { skipped: true, reason: 'No content to embed' }
    }

    const { embedding } = await step.run('generate-embedding', async () => {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set')
      }

      const openrouter = createOpenRouter({ apiKey })

      return embed({
        model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
        value: textToEmbed,
      })
    })

    await step.run('store-embedding', async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
      }

      const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

      const { error } = await supabase
        .from('notes')
        .update({ embedding: embedding as unknown as string })
        .eq('id', noteId)

      if (error) {
        throw new Error(`Failed to store embedding: ${error.message}`)
      }
    })

    return { success: true, noteId }
  }
)
