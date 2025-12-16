'use server';

import { createClient } from '@/lib/supabase/server';
import type { ConflictWithNotes, ConflictStatus } from '../types';

export interface GetConflictsResult {
  success: boolean;
  data?: ConflictWithNotes[];
  error?: string;
}

interface ConflictRow {
  id: string;
  explanation: string;
  conflict_type: 'contradiction' | 'tension';
  status: ConflictStatus;
  created_at: string;
  note_a: { id: string; title: string } | null;
  note_b: { id: string; title: string } | null;
}

/**
 * Fetch all conflicts for the current user with note details
 * @param status - Filter by conflict status (default: 'active')
 */
export async function getConflicts(
  status: ConflictStatus = 'active'
): Promise<GetConflictsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('conflicts')
      .select(
        `
        id,
        explanation,
        conflict_type,
        status,
        created_at,
        note_a:notes!note_a_id(id, title),
        note_b:notes!note_b_id(id, title)
      `
      )
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Filter out conflicts where either note is null (deleted)
    // and transform to ConflictWithNotes type
    // Note: Supabase returns joined relations as arrays, cast via unknown
    const conflicts: ConflictWithNotes[] = (data as unknown as ConflictRow[])
      .filter((row) => row.note_a !== null && row.note_b !== null)
      .map((row) => ({
        id: row.id,
        explanation: row.explanation,
        conflict_type: row.conflict_type,
        status: row.status,
        created_at: row.created_at,
        note_a: row.note_a!,
        note_b: row.note_b!,
      }));

    return { success: true, data: conflicts };
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
