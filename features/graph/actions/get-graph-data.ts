'use server'

import { createClient } from '@/lib/supabase/server'
import type { GraphNoteData, GraphConflictData } from '../types'

export interface RawGraphData {
  notes: GraphNoteData[]
  conflicts: GraphConflictData[]
}

export async function getGraphData(): Promise<RawGraphData> {
  const supabase = await createClient()

  const [notesResult, conflictsResult] = await Promise.all([
    supabase.rpc('get_graph_notes'),
    supabase.rpc('get_graph_conflicts'),
  ])

  if (notesResult.error) {
    console.error('[getGraphData] Notes error:', notesResult.error.message)
    throw new Error(`Failed to fetch graph notes: ${notesResult.error.message}`)
  }

  if (conflictsResult.error) {
    console.error('[getGraphData] Conflicts error:', conflictsResult.error.message)
    throw new Error(`Failed to fetch graph conflicts: ${conflictsResult.error.message}`)
  }

  return {
    notes: (notesResult.data ?? []) as GraphNoteData[],
    conflicts: (conflictsResult.data ?? []) as GraphConflictData[],
  }
}
