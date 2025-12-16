'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dismissConflict } from '../actions/dismiss-conflict';
import { conflictKeys } from './use-conflicts';
import type { ConflictWithNotes, NoteConflict } from '../types';

/**
 * Hook to dismiss a conflict with optimistic updates
 * Removes the conflict from all relevant caches immediately,
 * rolling back on error.
 */
export function useDismissConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conflictId: string) => {
      const result = await dismissConflict(conflictId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to dismiss conflict');
      }
      return conflictId;
    },
    onMutate: async (conflictId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: conflictKeys.all });

      // Snapshot previous values for rollback
      const previousConflicts = queryClient.getQueryData<ConflictWithNotes[]>(
        conflictKeys.list({ status: 'active' })
      );
      const previousCount = queryClient.getQueryData<number>(
        conflictKeys.count()
      );

      // Get the conflict being dismissed to find affected note queries
      const dismissedConflict = previousConflicts?.find(
        (c) => c.id === conflictId
      );

      // Snapshot note-specific conflict caches
      const noteAConflicts = dismissedConflict
        ? queryClient.getQueryData<NoteConflict[]>(
            conflictKeys.byNote(dismissedConflict.note_a.id)
          )
        : undefined;
      const noteBConflicts = dismissedConflict
        ? queryClient.getQueryData<NoteConflict[]>(
            conflictKeys.byNote(dismissedConflict.note_b.id)
          )
        : undefined;

      // Optimistically remove from main conflicts list
      queryClient.setQueryData<ConflictWithNotes[]>(
        conflictKeys.list({ status: 'active' }),
        (old) => old?.filter((c) => c.id !== conflictId)
      );

      // Optimistically decrement count
      queryClient.setQueryData<number>(conflictKeys.count(), (old) =>
        old !== undefined ? Math.max(0, old - 1) : undefined
      );

      // Optimistically remove from note-specific caches
      if (dismissedConflict) {
        queryClient.setQueryData<NoteConflict[]>(
          conflictKeys.byNote(dismissedConflict.note_a.id),
          (old) => old?.filter((c) => c.id !== conflictId)
        );
        queryClient.setQueryData<NoteConflict[]>(
          conflictKeys.byNote(dismissedConflict.note_b.id),
          (old) => old?.filter((c) => c.id !== conflictId)
        );
      }

      return {
        previousConflicts,
        previousCount,
        dismissedConflict,
        noteAConflicts,
        noteBConflicts,
      };
    },
    onError: (_err, _conflictId, context) => {
      // Rollback on error
      if (context?.previousConflicts !== undefined) {
        queryClient.setQueryData(
          conflictKeys.list({ status: 'active' }),
          context.previousConflicts
        );
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(conflictKeys.count(), context.previousCount);
      }
      if (context?.dismissedConflict && context?.noteAConflicts !== undefined) {
        queryClient.setQueryData(
          conflictKeys.byNote(context.dismissedConflict.note_a.id),
          context.noteAConflicts
        );
      }
      if (context?.dismissedConflict && context?.noteBConflicts !== undefined) {
        queryClient.setQueryData(
          conflictKeys.byNote(context.dismissedConflict.note_b.id),
          context.noteBConflicts
        );
      }
    },
    onSettled: () => {
      // Invalidate to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: conflictKeys.all });
    },
  });
}
