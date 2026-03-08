import { inngest } from '../client'
import { NonRetriableError } from 'inngest'
import { createClient } from '@supabase/supabase-js'
import { NoObjectGeneratedError } from 'ai'
import type { Database } from '@/types/database.types'
import { judgeNotePair, type NoteForJudgment } from '@/lib/ai/conflict-judgment'
import {
  buildPairJudgmentKey,
  computePairHash,
  fetchExistingJudgmentKeys,
  getCanonicalPairIds,
} from './conflict-pair-utils'

const JUDGMENT_MODEL = 'openai/gpt-4o-mini'
const CONFIDENCE_THRESHOLD = 0.7

export { computePairHash } from './conflict-pair-utils'

/**
 * Inngest function that detects conflicts between notes using LLM judgment.
 *
 * Triggered by: note/conflicts.detection.requested, note/embedding.completed
 *
 * Flow:
 * 1. Fetch target note with its embedding_content_hash
 * 2. Get candidate pairs via find_potential_conflicts RPC
 * 3. Filter out already-judged pairs (by pair_content_hash)
 * 4. For each unjudged pair, call LLM and store judgment
 * 5. Create conflicts for high-confidence tension/contradiction judgments
 */
export const detectNoteConflicts = inngest.createFunction(
  {
    id: 'detect-note-conflicts',
    name: 'Detect Note Conflicts',
    retries: 3,
    concurrency: { limit: 3 },
  },
  [
    { event: 'note/conflicts.detection.requested' },
    { event: 'note/embedding.completed' },
  ],
  async ({ event, step }) => {
    const { noteId, contentHash } = event.data

    // Validate environment variables early (fail fast, no retries for config errors)
    const apiKey = process.env.OPENROUTER_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!apiKey) {
      throw new NonRetriableError(
        'OPENROUTER_API_KEY environment variable is not set'
      )
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new NonRetriableError('Missing Supabase environment variables')
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    // Step 1: Fetch target note data
    const targetNote = await step.run('fetch-target-note', async () => {
      const { data: note, error } = await supabase
        .from('notes')
        .select(
          'id, user_id, title, problem, content, embedding_content_hash, embedding_status, deleted_at'
        )
        .eq('id', noteId)
        .single()

      if (error || !note) {
        throw new NonRetriableError(`Note not found: ${noteId}`)
      }

      if (note.deleted_at) {
        return { skipped: true, reason: 'Note is trashed', note: null }
      }

      // Verify embedding is completed and hash matches
      if (note.embedding_status !== 'completed') {
        throw new NonRetriableError(
          `Note embedding not completed: ${noteId} (status: ${note.embedding_status})`
        )
      }

      if (note.embedding_content_hash !== contentHash) {
        // Content changed since event was sent - skip
        return { skipped: true, reason: 'Content hash mismatch', note: null }
      }

      return { skipped: false, reason: null, note }
    })

    if (targetNote.skipped || !targetNote.note) {
      return {
        skipped: true,
        reason: targetNote.reason,
        noteId,
        candidates: 0,
        judged: 0,
        conflicts: 0,
      }
    }

    const note = targetNote.note

    // Step 2: Fetch candidate notes via RPC
    const candidates = await step.run('fetch-candidates', async () => {
      const { data, error } = await supabase.rpc('find_potential_conflicts', {
        target_note_id: noteId,
        similarity_threshold: 0.65,
        match_count: 10,
      })

      if (error) {
        console.error(
          `[Conflicts] Failed to fetch candidates for note ${noteId}: ${error.message}`
        )
        throw new Error(`Failed to fetch conflict candidates: ${error.message}`)
      }

      return data || []
    })

    if (candidates.length === 0) {
      return {
        success: true,
        noteId,
        candidates: 0,
        judged: 0,
        conflicts: 0,
      }
    }

    // Step 3: Fetch candidate notes' content hashes for pair hash computation
    const candidateDetails = await step.run(
      'fetch-candidate-details',
      async () => {
        const candidateIds = candidates.map((c) => c.note_id)

        const { data, error } = await supabase
          .from('notes')
          .select('id, title, problem, content, embedding_content_hash, deleted_at')
          .in('id', candidateIds)
          .is('deleted_at', null)

        if (error) {
          console.error(
            `[Conflicts] Failed to fetch candidate details: ${error.message}`
          )
          throw new Error(`Failed to fetch candidate details: ${error.message}`)
        }

        return data || []
      }
    )

    // Step 4: Compute pair hashes and filter already-judged pairs
    const pairsToJudge = await step.run('filter-already-judged', async () => {
      // Compute pair hashes for all candidates
      const pairData = candidateDetails
        .filter((c) => c.embedding_content_hash) // Must have embedding hash
        .map((candidate) => {
          const pairHash = computePairHash(
            note.embedding_content_hash!,
            candidate.embedding_content_hash!,
            note.id,
            candidate.id
          )
          const [noteAId, noteBId] = getCanonicalPairIds(note.id, candidate.id)

          return {
            noteAId,
            noteBId,
            pairHash,
            judgmentKey: buildPairJudgmentKey(noteAId, noteBId, pairHash),
            candidate,
          }
        })

      if (pairData.length === 0) {
        return []
      }

      try {
        const existingJudgmentKeys = await fetchExistingJudgmentKeys(
          supabase,
          pairData.map((pair) => ({
            noteAId: pair.noteAId,
            noteBId: pair.noteBId,
            pairHash: pair.pairHash,
          }))
        )

        return pairData.filter((pair) => !existingJudgmentKeys.has(pair.judgmentKey))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown judgment lookup error'
        console.error(
          `[Conflicts] Failed to query existing judgments: ${message}`
        )
        throw new Error(message)
      }
    })

    if (pairsToJudge.length === 0) {
      return {
        success: true,
        noteId,
        candidates: candidates.length,
        judged: 0,
        conflicts: 0,
        reason: 'All pairs already judged',
      }
    }

    // Step 5: Process each unjudged pair
    const results = await step.run('process-pairs', async () => {
      const processed: {
        judged: number
        conflicts: number
        errors: number
      } = {
        judged: 0,
        conflicts: 0,
        errors: 0,
      }

      for (const pair of pairsToJudge) {
        try {
          const verifyPairStillEligible = async () => {
            const { data: activeNotes, error: activeNotesError } = await supabase
              .from('notes')
              .select('id, embedding_content_hash')
              .in('id', [note.id, pair.candidate.id])
              .is('deleted_at', null)

            if (activeNotesError) {
              throw new Error(`Failed to verify note activity: ${activeNotesError.message}`)
            }

            if ((activeNotes || []).length < 2) {
              return { eligible: false, reason: 'Note trashed during processing' }
            }

            const activeNoteMap = new Map(
              (activeNotes || []).map((activeNote) => [activeNote.id, activeNote])
            )
            const sourceNote = activeNoteMap.get(note.id)
            const candidateNote = activeNoteMap.get(pair.candidate.id)

            if (
              !sourceNote?.embedding_content_hash ||
              !candidateNote?.embedding_content_hash
            ) {
              return { eligible: false, reason: 'Embedding hash missing during processing' }
            }

            const currentPairHash = computePairHash(
              sourceNote.embedding_content_hash,
              candidateNote.embedding_content_hash,
              note.id,
              pair.candidate.id
            )

            if (currentPairHash !== pair.pairHash) {
              return { eligible: false, reason: 'Pair content changed during processing' }
            }

            return { eligible: true as const, reason: null }
          }

          const initialEligibility = await verifyPairStillEligible()
          if (!initialEligibility.eligible) {
            console.debug(
              `[Conflicts] Skipping pair (${pair.noteAId}, ${pair.noteBId}): ${initialEligibility.reason}`
            )
            continue
          }

          // Prepare note data for judgment
          const noteAData: NoteForJudgment =
            note.id < pair.candidate.id
              ? {
                  title: note.title,
                  problem: note.problem,
                  content: note.content,
                }
              : {
                  title: pair.candidate.title,
                  problem: pair.candidate.problem,
                  content: pair.candidate.content,
                }

          const noteBData: NoteForJudgment =
            note.id < pair.candidate.id
              ? {
                  title: pair.candidate.title,
                  problem: pair.candidate.problem,
                  content: pair.candidate.content,
                }
              : {
                  title: note.title,
                  problem: note.problem,
                  content: note.content,
                }

          // Call LLM for judgment
          const judgment = await judgeNotePair(noteAData, noteBData, apiKey)

          // Store judgment in conflict_judgments table
          const { error: insertError } = await supabase
            .from('conflict_judgments')
            .insert({
              user_id: note.user_id,
              note_a_id: pair.noteAId,
              note_b_id: pair.noteBId,
              pair_content_hash: pair.pairHash,
              judgment_result: judgment.result,
              confidence: judgment.confidence,
              reasoning: judgment.reasoning,
              explanation: judgment.explanation || null,
              model: JUDGMENT_MODEL,
            })

          if (insertError) {
            // Check if it's a unique constraint violation (already judged)
            if (insertError.code === '23505') {
              console.warn(
                `[Conflicts] Judgment already exists for pair ${pair.pairHash}`
              )
              continue
            }
            console.error(
              `[Conflicts] Failed to insert judgment: ${insertError.message}`
            )
            processed.errors++
            continue
          }

          const postInsertEligibility = await verifyPairStillEligible()
          if (!postInsertEligibility.eligible) {
            const { error: cleanupError } = await supabase
              .from('conflict_judgments')
              .delete()
              .eq('pair_content_hash', pair.pairHash)
              .eq('note_a_id', pair.noteAId)
              .eq('note_b_id', pair.noteBId)

            if (cleanupError) {
              console.warn(
                `[Conflicts] Failed to clean stale judgment for pair ${pair.pairHash}: ${cleanupError.message}`
              )
            }

            console.debug(
              `[Conflicts] Removed stale judgment for pair (${pair.noteAId}, ${pair.noteBId}): ${postInsertEligibility.reason}`
            )
            continue
          }

          processed.judged++

          // Create conflict if result is tension/contradiction with high confidence
          if (
            (judgment.result === 'tension' ||
              judgment.result === 'contradiction') &&
            judgment.confidence >= CONFIDENCE_THRESHOLD
          ) {
            const { error: conflictError } = await supabase
              .from('conflicts')
              .upsert(
                {
                  user_id: note.user_id,
                  note_a_id: pair.noteAId,
                  note_b_id: pair.noteBId,
                  explanation: judgment.explanation || judgment.reasoning,
                  conflict_type: judgment.result as 'tension' | 'contradiction',
                  status: 'active',
                },
                { onConflict: 'note_a_id,note_b_id' }
              )

              if (conflictError) {
                console.error(
                  `[Conflicts] Failed to create conflict: ${conflictError.message}`
                )
              } else {
                const postConflictEligibility = await verifyPairStillEligible()
                if (!postConflictEligibility.eligible) {
                  const { error: cleanupError } = await supabase
                    .from('conflicts')
                    .delete()
                    .eq('note_a_id', pair.noteAId)
                    .eq('note_b_id', pair.noteBId)

                  if (cleanupError) {
                    console.warn(
                      `[Conflicts] Failed to clean stale conflict for pair (${pair.noteAId}, ${pair.noteBId}): ${cleanupError.message}`
                    )
                  } else {
                    console.debug(
                      `[Conflicts] Removed stale conflict for pair (${pair.noteAId}, ${pair.noteBId}): ${postConflictEligibility.reason}`
                    )
                  }
                } else {
                  processed.conflicts++
                }
              }
            }
        } catch (error) {
          if (error instanceof NoObjectGeneratedError) {
            // LLM failed to generate valid structured output - skip this pair
            console.warn(
              `[Conflicts] LLM failed to generate judgment for pair (${pair.noteAId}, ${pair.noteBId}): ${error.message}`
            )
            processed.errors++
            continue
          }
          // Re-throw other errors to trigger Inngest retry
          throw error
        }
      }

      return processed
    })

    return {
      success: true,
      noteId,
      candidates: candidates.length,
      judged: results.judged,
      conflicts: results.conflicts,
      errors: results.errors,
    }
  }
)
