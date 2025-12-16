import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useDismissConflict } from '@/features/conflicts/hooks/use-dismiss-conflict';
import { conflictKeys } from '@/features/conflicts/hooks/use-conflicts';
import type { ConflictWithNotes } from '@/features/conflicts/types';

const mockDismissConflict = vi.fn();

vi.mock('@/features/conflicts/actions/dismiss-conflict', () => ({
  dismissConflict: (id: string) => mockDismissConflict(id),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

describe('useDismissConflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dismiss a conflict successfully', async () => {
    mockDismissConflict.mockResolvedValueOnce({ success: true });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useDismissConflict(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate('conflict-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDismissConflict).toHaveBeenCalledWith('conflict-1');
  });

  it('should handle mutation errors', async () => {
    mockDismissConflict.mockResolvedValueOnce({
      success: false,
      error: 'Dismiss failed',
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useDismissConflict(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate('conflict-1');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Dismiss failed');
  });

  it('should optimistically remove conflict from list', async () => {
    const initialConflicts: ConflictWithNotes[] = [
      {
        id: 'conflict-1',
        explanation: 'Test conflict',
        conflict_type: 'contradiction',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        note_a: { id: 'note-1', title: 'Note A' },
        note_b: { id: 'note-2', title: 'Note B' },
      },
      {
        id: 'conflict-2',
        explanation: 'Another conflict',
        conflict_type: 'tension',
        status: 'active',
        created_at: '2024-01-02T00:00:00Z',
        note_a: { id: 'note-3', title: 'Note C' },
        note_b: { id: 'note-4', title: 'Note D' },
      },
    ];

    // Delay the mock to observe optimistic update
    mockDismissConflict.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );

    const queryClient = createQueryClient();
    queryClient.setQueryData(conflictKeys.list({ status: 'active' }), initialConflicts);
    queryClient.setQueryData(conflictKeys.count(), 2);

    const { result } = renderHook(() => useDismissConflict(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate('conflict-1');
    });

    // Check optimistic update happened immediately
    await waitFor(() => {
      const conflicts = queryClient.getQueryData<ConflictWithNotes[]>(
        conflictKeys.list({ status: 'active' })
      );
      expect(conflicts).toHaveLength(1);
      expect(conflicts![0].id).toBe('conflict-2');
    });

    // Count should be decremented
    const count = queryClient.getQueryData<number>(conflictKeys.count());
    expect(count).toBe(1);
  });

  it('should rollback on error', async () => {
    const initialConflicts: ConflictWithNotes[] = [
      {
        id: 'conflict-1',
        explanation: 'Test conflict',
        conflict_type: 'contradiction',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        note_a: { id: 'note-1', title: 'Note A' },
        note_b: { id: 'note-2', title: 'Note B' },
      },
    ];

    mockDismissConflict.mockResolvedValueOnce({
      success: false,
      error: 'Server error',
    });

    const queryClient = createQueryClient();
    queryClient.setQueryData(conflictKeys.list({ status: 'active' }), initialConflicts);
    queryClient.setQueryData(conflictKeys.count(), 1);

    const { result } = renderHook(() => useDismissConflict(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate('conflict-1');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should rollback to original state
    const conflicts = queryClient.getQueryData<ConflictWithNotes[]>(
      conflictKeys.list({ status: 'active' })
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts![0].id).toBe('conflict-1');

    const count = queryClient.getQueryData<number>(conflictKeys.count());
    expect(count).toBe(1);
  });

  it('should invalidate queries on settled', async () => {
    mockDismissConflict.mockResolvedValueOnce({ success: true });

    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDismissConflict(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate('conflict-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conflictKeys.all });
  });
});
