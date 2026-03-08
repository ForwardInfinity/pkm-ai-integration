import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type PairJudgmentLookup = {
  userId: string
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

  const pairsByUserId = new Map<string, PairJudgmentLookup[]>()

  for (const pair of pairs) {
    const userPairs = pairsByUserId.get(pair.userId)
    if (userPairs) {
      userPairs.push(pair)
      continue
    }

    pairsByUserId.set(pair.userId, [pair])
  }

  const existingKeys = new Set<string>()

  for (const [userId, userPairs] of pairsByUserId.entries()) {
    const noteAIds = [...new Set(userPairs.map((pair) => pair.noteAId))]
    const noteBIds = [...new Set(userPairs.map((pair) => pair.noteBId))]
    const pairHashes = [...new Set(userPairs.map((pair) => pair.pairHash))]

    const { data, error } = await supabase
      .from('conflict_judgments')
      .select('note_a_id, note_b_id, pair_content_hash')
      .eq('user_id', userId)
      .in('note_a_id', noteAIds)
      .in('note_b_id', noteBIds)
      .in('pair_content_hash', pairHashes)

    if (error) {
      throw new Error(`Failed to query existing judgments: ${error.message}`)
    }

    for (const judgment of data || []) {
      existingKeys.add(
        buildPairJudgmentKey(
          judgment.note_a_id,
          judgment.note_b_id,
          judgment.pair_content_hash
        )
      )
    }
  }

  return existingKeys
}
