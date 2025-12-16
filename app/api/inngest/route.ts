import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import {
  purgeOldTrash,
  generateNoteEmbedding,
  reconcileEmbeddings,
  detectNoteConflicts,
  reconcileConflicts,
} from '@/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    purgeOldTrash,
    generateNoteEmbedding,
    reconcileEmbeddings,
    detectNoteConflicts,
    reconcileConflicts,
  ],
})
