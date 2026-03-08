import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useConflictCount } from '@/features/conflicts/hooks/use-conflict-count';
import {
  beginNoteAnalysisRefresh,
  NOTE_ANALYSIS_REFRESH_INTERVAL_MS,
  resetNoteAnalysisRefreshState,
} from '@/lib/note-analysis-refresh';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useConflictCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNoteAnalysisRefreshState();
  });

  afterEach(() => {
    resetNoteAnalysisRefreshState();
    vi.useRealTimers();
  });

  it('should fetch conflict count successfully', async () => {
    mockRpc.mockResolvedValueOnce({ data: 5, error: null });

    const { result } = renderHook(() => useConflictCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledWith('get_unresolved_conflict_count');
    expect(result.current.data).toBe(5);
  });

  it('should return 0 when data is null', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useConflictCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(0);
  });

  it('should return 0 when no conflicts exist', async () => {
    mockRpc.mockResolvedValueOnce({ data: 0, error: null });

    const { result } = renderHook(() => useConflictCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(0);
  });

  it('should handle API errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    const { result } = renderHook(() => useConflictCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Database error');
  });

  it('should handle large counts', async () => {
    mockRpc.mockResolvedValueOnce({ data: 999, error: null });

    const { result } = renderHook(() => useConflictCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(999);
  });

  it('polls while any note is inside the refresh window', async () => {
    vi.useFakeTimers();
    mockRpc.mockResolvedValue({ data: 5, error: null });
    beginNoteAnalysisRefresh('note-123');

    renderHook(() => useConflictCount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(NOTE_ANALYSIS_REFRESH_INTERVAL_MS + 50);
      await Promise.resolve();
    });

    expect(mockRpc).toHaveBeenCalledTimes(2);
  });
});
