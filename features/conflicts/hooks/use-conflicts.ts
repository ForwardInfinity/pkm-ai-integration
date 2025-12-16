'use client';

import { useQuery } from '@tanstack/react-query';
import { getConflicts } from '../actions/get-conflicts';
import type { ConflictWithNotes, ConflictStatus } from '../types';

/** Query key factory for conflicts */
export const conflictKeys = {
  all: ['conflicts'] as const,
  lists: () => [...conflictKeys.all, 'list'] as const,
  list: (filters?: { status?: ConflictStatus }) =>
    [...conflictKeys.lists(), filters] as const,
  byNote: (noteId: string) => [...conflictKeys.all, 'note', noteId] as const,
  count: () => [...conflictKeys.all, 'count'] as const,
};

async function fetchConflicts(
  status: ConflictStatus = 'active'
): Promise<ConflictWithNotes[]> {
  const result = await getConflicts(status);

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch conflicts');
  }

  return result.data ?? [];
}

/**
 * Hook to fetch all conflicts for the current user
 * @param status - Filter by conflict status (default: 'active')
 */
export function useConflicts(status: ConflictStatus = 'active') {
  return useQuery({
    queryKey: conflictKeys.list({ status }),
    queryFn: () => fetchConflicts(status),
    staleTime: 30 * 1000,
  });
}
