'use server'

import { inngest } from '@/lib/inngest/client'

export type TriggerEmbeddingResult = {
  success: boolean
  error?: string
}

export async function triggerEmbeddingGeneration(note: {
  id: string
  title: string
  problem: string | null
  content: string
}): Promise<TriggerEmbeddingResult> {
  try {
    await inngest.send({
      name: 'note/embedding.requested',
      data: {
        noteId: note.id,
        title: note.title,
        problem: note.problem,
        content: note.content,
      },
    })
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Inngest] Failed to send embedding event:', message)
    return { success: false, error: message }
  }
}
