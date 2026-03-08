'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  NOTE_ANALYSIS_REFRESH_INTERVAL_MS,
  useIsAnyNoteAnalysisRefreshing,
} from '@/lib/note-analysis-refresh';
import { conflictKeys } from './use-conflicts';

async function fetchConflictCount(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_unresolved_conflict_count');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? 0;
}

/**
 * Hook to fetch the count of unresolved (active) conflicts
 * Used for sidebar badge display
 */
export function useConflictCount() {
  const isRefreshing = useIsAnyNoteAnalysisRefreshing();

  return useQuery({
    queryKey: conflictKeys.count(),
    queryFn: fetchConflictCount,
    staleTime: 30 * 1000,
    refetchInterval: isRefreshing ? NOTE_ANALYSIS_REFRESH_INTERVAL_MS : false,
  });
}
