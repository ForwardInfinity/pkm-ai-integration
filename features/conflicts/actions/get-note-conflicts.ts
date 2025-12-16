'use server';

import { createClient } from '@/lib/supabase/server';
import type { NoteConflict, ConflictType } from '../types';

export interface GetNoteConflictsResult {
  success: boolean;
  data?: NoteConflict[];
  error?: string;
}

interface ConflictRow {
  id: string;
  explanation: string;
  conflict_type: ConflictType;
  note_a_id: string;
  note_b_id: string;
  note_a: { id: string; title: string } | null;
  note_b: { id: string; title: string } | null;
}

/**
 * Fetch active conflicts for a specific note
 * Returns conflicts from the perspective of the target note,
 * identifying the "other" note in each conflict.
 * @param noteId - The note to find conflicts for
 */
export async function getNoteConflicts(
  noteId: string
): Promise<GetNoteConflictsResult> {
  try {
    const supabase = await createClient();

    // Query conflicts where the note is either note_a or note_b
    const { data, error } = await supabase
      .from('conflicts')
      .select(
        `
        id,
        explanation,
        conflict_type,
        note_a_id,
        note_b_id,
        note_a:notes!note_a_id(id, title),
        note_b:notes!note_b_id(id, title)
      `
      )
      .eq('status', 'active')
      .or(`note_a_id.eq.${noteId},note_b_id.eq.${noteId}`);

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform to NoteConflict, identifying the "other" note
    // Note: Supabase returns joined relations as arrays, cast via unknown
    const conflicts: NoteConflict[] = (data as unknown as ConflictRow[])
      .filter((row) => row.note_a !== null && row.note_b !== null)
      .map((row) => {
        const isNoteA = row.note_a_id === noteId;
        const otherNote = isNoteA ? row.note_b! : row.note_a!;

        return {
          id: row.id,
          explanation: row.explanation,
          conflict_type: row.conflict_type,
          otherNoteId: otherNote.id,
          otherNoteTitle: otherNote.title,
        };
      });

    return { success: true, data: conflicts };
  } catch (error) {
    console.error('Error fetching note conflicts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
