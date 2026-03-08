import { inngest } from '../client'
import { NonRetriableError } from 'inngest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  buildPairJudgmentKey,
  computePairHash,
  fetchExistingJudgmentKeys,
  getCanonicalPairIds,
} from './conflict-pair-utils'

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
        .select('id, user_id, embedding_content_hash')
        .eq('embedding_status', 'completed')
        .not('embedding_content_hash', 'is', null)
        .is('deleted_at', null)
        .order('embedding_updated_at', { ascending: true, nullsFirst: false })
        .limit(BATCH_LIMIT)

      if (error) {
        throw new Error(`Failed to fetch notes: ${error.message}`)
      }

      return (data || []).filter(
        (
          n
        ): n is {
          id: string
          user_id: string
          embedding_content_hash: string
        } => Boolean(n.user_id && n.embedding_content_hash)
      )
    })

    if (candidateNotes.length === 0) {
      return {
        reconciled: 0,
        message: 'No notes eligible for conflict reconciliation',
      }
    }

    const candidateMatches = await step.run('collect-candidate-pairs', async () => {
      const collected: Array<{
        sourceNoteId: string
        sourceUserId: string
        sourceContentHash: string
        candidateId: string
      }> = []

      for (const note of candidateNotes) {
        const { data, error } = await supabase.rpc('find_potential_conflicts', {
          target_note_id: note.id,
          similarity_threshold: 0.65,
          match_count: 10,
        })

        if (error) {
          throw new Error(
            `Failed to fetch conflict candidates for note ${note.id}: ${error.message}`
          )
        }

        for (const candidate of data || []) {
          collected.push({
            sourceNoteId: note.id,
            sourceUserId: note.user_id,
            sourceContentHash: note.embedding_content_hash,
            candidateId: candidate.note_id,
          })
        }
      }

      return collected
    })

    if (candidateMatches.length === 0) {
      return {
        reconciled: 0,
        candidates: candidateNotes.length,
        candidatePairs: 0,
        message: 'No candidate pairs found for conflict reconciliation',
      }
    }

    const pairState = await step.run('filter-unjudged-pairs', async () => {
      const knownHashes = new Map(
        candidateNotes.map((note) => [note.id, note.embedding_content_hash])
      )

      const unresolvedCandidateIds = [
        ...new Set(
          candidateMatches
            .map((match) => match.candidateId)
            .filter((candidateId) => !knownHashes.has(candidateId))
        ),
      ]

      if (unresolvedCandidateIds.length > 0) {
        const { data, error } = await supabase
          .from('notes')
          .select('id, embedding_content_hash')
          .in('id', unresolvedCandidateIds)
          .eq('embedding_status', 'completed')
          .not('embedding_content_hash', 'is', null)
          .is('deleted_at', null)

        if (error) {
          throw new Error(`Failed to fetch candidate note hashes: ${error.message}`)
        }

        for (const note of data || []) {
          if (note.embedding_content_hash) {
            knownHashes.set(note.id, note.embedding_content_hash)
          }
        }
      }

      const uniquePairs = new Map<
        string,
        {
          userId: string
          sourceNoteId: string
          sourceContentHash: string
          noteAId: string
          noteBId: string
          pairHash: string
        }
      >()

      for (const match of candidateMatches) {
        const candidateHash = knownHashes.get(match.candidateId)
        if (!candidateHash) {
          continue
        }

        const [noteAId, noteBId] = getCanonicalPairIds(
          match.sourceNoteId,
          match.candidateId
        )
        const pairHash = computePairHash(
          match.sourceContentHash,
          candidateHash,
          match.sourceNoteId,
          match.candidateId
        )
        const pairKey = buildPairJudgmentKey(noteAId, noteBId, pairHash)

        if (!uniquePairs.has(pairKey)) {
          uniquePairs.set(pairKey, {
            userId: match.sourceUserId,
            sourceNoteId: match.sourceNoteId,
            sourceContentHash: match.sourceContentHash,
            noteAId,
            noteBId,
            pairHash,
          })
        }
      }

      const existingJudgmentKeys = await fetchExistingJudgmentKeys(
        supabase,
        Array.from(uniquePairs.values()).map((pair) => ({
          userId: pair.userId,
          noteAId: pair.noteAId,
          noteBId: pair.noteBId,
          pairHash: pair.pairHash,
        }))
      )

      const notesToEmit = new Map<string, string>()
      let unjudgedPairs = 0

      for (const [pairKey, pair] of uniquePairs.entries()) {
        if (existingJudgmentKeys.has(pairKey)) {
          continue
        }

        unjudgedPairs++
        notesToEmit.set(pair.sourceNoteId, pair.sourceContentHash)
      }

      return {
        notesToEmit: Array.from(notesToEmit, ([noteId, contentHash]) => ({
          noteId,
          contentHash,
        })),
        uniquePairs: uniquePairs.size,
        unjudgedPairs,
      }
    })

    if (pairState.notesToEmit.length === 0) {
      return {
        reconciled: 0,
        candidates: candidateNotes.length,
        candidatePairs: candidateMatches.length,
        uniquePairs: pairState.uniquePairs,
        unjudgedPairs: 0,
        skippedAlreadyJudgedPairs: pairState.uniquePairs,
        message: 'All candidate pairs already have conflict judgments',
      }
    }

    // Deliberately omit event IDs so the same note/hash can be retried after
    // partial pair-level failures; pair judgments provide idempotency instead.
    const events = pairState.notesToEmit.map((note) => ({
      name: 'note/conflicts.detection.requested' as const,
      data: {
        noteId: note.noteId,
        contentHash: note.contentHash,
      },
    }))

    await step.sendEvent('emit-conflict-detection-events', events)

    return {
      reconciled: pairState.notesToEmit.length,
      candidates: candidateNotes.length,
      candidatePairs: candidateMatches.length,
      uniquePairs: pairState.uniquePairs,
      unjudgedPairs: pairState.unjudgedPairs,
      skippedAlreadyJudgedPairs:
        pairState.uniquePairs - pairState.unjudgedPairs,
    }
  }
)
