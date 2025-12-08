'use server'

import { inngest } from '@/lib/inngest/client'

export async function triggerEmbeddingGeneration(note: {
  id: string
  title: string
  problem: string | null
  content: string
}) {
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
    console.log('[Inngest] Embedding event sent for note:', note.id)
  } catch (error) {
    console.error('[Inngest] Failed to send embedding event:', error)
  }
}
