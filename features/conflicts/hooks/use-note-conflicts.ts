'use client';

import { useQuery } from '@tanstack/react-query';
import { getNoteConflicts } from '../actions/get-note-conflicts';
import { conflictKeys } from './use-conflicts';
import type { NoteConflict } from '../types';
import { getPersistedNoteId } from '@/features/notes/utils/note-id';

async function fetchNoteConflicts(noteId: string): Promise<NoteConflict[]> {
  const result = await getNoteConflicts(noteId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch note conflicts');
  }

  return result.data ?? [];
}

/**
 * Hook to fetch conflicts for a specific note
 * Returns conflicts from the perspective of the target note,
 * identifying the "other" note in each conflict.
 * @param noteId - The note to find conflicts for (null, 'new', and temp IDs disable the query)
 */
export function useNoteConflicts(noteId: string | null) {
  const persistedNoteId = getPersistedNoteId(noteId);

  return useQuery({
    queryKey: persistedNoteId
      ? conflictKeys.byNote(persistedNoteId)
      : ['conflicts', 'none'],
    queryFn: () =>
      persistedNoteId ? fetchNoteConflicts(persistedNoteId) : Promise.resolve([]),
    enabled: !!persistedNoteId,
    staleTime: 30 * 1000,
  });
}
