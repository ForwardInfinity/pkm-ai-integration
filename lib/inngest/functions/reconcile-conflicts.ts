import { inngest } from '../client'
import { NonRetriableError } from 'inngest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const BATCH_LIMIT = 50

export const reconcileConflicts = inngest.createFunction(
  {
    id: 'reconcile-conflicts',
    name: 'Reconcile Conflict Detection',
  },
  { cron: '*/10 * * * *' }, // Every 10 minutes
  async ({ step }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new NonRetriableError('Missing Supabase environment variables')
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    const candidateNotes = await step.run('fetch-candidate-notes', async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, embedding_content_hash')
        .eq('embedding_status', 'completed')
        .not('embedding_content_hash', 'is', null)
        .is('deleted_at', null)
        .order('embedding_updated_at', { ascending: true, nullsFirst: false })
        .limit(BATCH_LIMIT)

      if (error) {
        throw new Error(`Failed to fetch notes: ${error.message}`)
      }

      return (data || []).filter(
        (n): n is { id: string; embedding_content_hash: string } =>
          Boolean(n.embedding_content_hash)
      )
    })

    if (candidateNotes.length === 0) {
      return {
        reconciled: 0,
        message: 'No notes eligible for conflict reconciliation',
      }
    }

    const noteIds = candidateNotes.map((n) => n.id)

    const alreadyCheckedNoteIdList = await step.run(
      'fetch-existing-judgments',
      async () => {
        const [aResult, bResult] = await Promise.all([
          supabase
            .from('conflict_judgments')
            .select('note_a_id')
            .in('note_a_id', noteIds),
          supabase
            .from('conflict_judgments')
            .select('note_b_id')
            .in('note_b_id', noteIds),
        ])

        if (aResult.error) {
          throw new Error(
            `Failed to fetch judgments (note_a_id): ${aResult.error.message}`
          )
        }
        if (bResult.error) {
          throw new Error(
            `Failed to fetch judgments (note_b_id): ${bResult.error.message}`
          )
        }

        const checked = new Set<string>()

        for (const row of aResult.data || []) {
          if (row.note_a_id) checked.add(row.note_a_id)
        }
        for (const row of bResult.data || []) {
          if (row.note_b_id) checked.add(row.note_b_id)
        }

        return Array.from(checked)
      }
    )

    const alreadyCheckedNoteIds = new Set(alreadyCheckedNoteIdList)

    const notesToEmit = candidateNotes.filter(
      (n) => !alreadyCheckedNoteIds.has(n.id)
    )

    if (notesToEmit.length === 0) {
      return {
        reconciled: 0,
        message: 'All candidate notes already have conflict judgments',
        candidates: candidateNotes.length,
      }
    }

    const events = notesToEmit.map((note) => ({
      id: `note-conflicts.detection.requested:${note.id}:${note.embedding_content_hash}`,
      name: 'note/conflicts.detection.requested' as const,
      data: {
        noteId: note.id,
        contentHash: note.embedding_content_hash,
      },
    }))

    await step.sendEvent('emit-conflict-detection-events', events)

    return {
      reconciled: notesToEmit.length,
      candidates: candidateNotes.length,
      skippedAlreadyJudged: candidateNotes.length - notesToEmit.length,
    }
  }
)
