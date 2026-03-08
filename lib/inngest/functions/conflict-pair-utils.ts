import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type PairJudgmentLookup = {
  noteAId: string
  noteBId: string
  pairHash: string
}

export function getCanonicalPairIds(
  firstNoteId: string,
  secondNoteId: string
): readonly [string, string] {
  return firstNoteId < secondNoteId
    ? [firstNoteId, secondNoteId]
    : [secondNoteId, firstNoteId]
}

/**
 * Computes a deterministic hash for a note pair.
 * Uses canonical ordering (smaller UUID first) to ensure consistency.
 */
export function computePairHash(
  noteAHash: string,
  noteBHash: string,
  noteAId: string,
  noteBId: string
): string {
  const [firstHash, secondHash] =
    noteAId < noteBId ? [noteAHash, noteBHash] : [noteBHash, noteAHash]

  return createHash('sha256').update(`${firstHash}:${secondHash}`).digest('hex')
}

export function buildPairJudgmentKey(
  noteAId: string,
  noteBId: string,
  pairHash: string
): string {
  return `${noteAId}:${noteBId}:${pairHash}`
}

export async function fetchExistingJudgmentKeys(
  supabase: SupabaseClient<Database>,
  pairs: PairJudgmentLookup[]
): Promise<Set<string>> {
  if (pairs.length === 0) {
    return new Set()
  }

  const noteAIds = [...new Set(pairs.map((pair) => pair.noteAId))]
  const noteBIds = [...new Set(pairs.map((pair) => pair.noteBId))]
  const pairHashes = [...new Set(pairs.map((pair) => pair.pairHash))]

  const { data, error } = await supabase
    .from('conflict_judgments')
    .select('note_a_id, note_b_id, pair_content_hash')
    .in('note_a_id', noteAIds)
    .in('note_b_id', noteBIds)
    .in('pair_content_hash', pairHashes)

  if (error) {
    throw new Error(`Failed to query existing judgments: ${error.message}`)
  }

  return new Set(
    (data || []).map((judgment) =>
      buildPairJudgmentKey(
        judgment.note_a_id,
        judgment.note_b_id,
        judgment.pair_content_hash
      )
    )
  )
}
