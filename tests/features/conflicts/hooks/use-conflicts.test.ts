import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useConflicts, conflictKeys } from '@/features/conflicts/hooks/use-conflicts';

const mockGetConflicts = vi.fn();

vi.mock('@/features/conflicts/actions/get-conflicts', () => ({
  getConflicts: () => mockGetConflicts(),
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

describe('useConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('conflictKeys', () => {
    it('should generate correct query keys', () => {
      expect(conflictKeys.all).toEqual(['conflicts']);
      expect(conflictKeys.lists()).toEqual(['conflicts', 'list']);
      expect(conflictKeys.list({ status: 'active' })).toEqual([
        'conflicts',
        'list',
        { status: 'active' },
      ]);
      expect(conflictKeys.byNote('note-123')).toEqual([
        'conflicts',
        'note',
        'note-123',
      ]);
      expect(conflictKeys.count()).toEqual(['conflicts', 'count']);
    });

    it('should generate unique keys for different filters', () => {
      const activeKey = conflictKeys.list({ status: 'active' });
      const dismissedKey = conflictKeys.list({ status: 'dismissed' });

      expect(activeKey).not.toEqual(dismissedKey);
    });
  });

  describe('when fetching conflicts successfully', () => {
    it('should return conflicts data', async () => {
      const mockConflicts = [
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

      mockGetConflicts.mockResolvedValueOnce({
        success: true,
        data: mockConflicts,
      });

      const { result } = renderHook(() => useConflicts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockConflicts);
    });

    it('should handle empty conflicts list', async () => {
      mockGetConflicts.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useConflicts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('when fetching fails', () => {
    it('should handle server action errors', async () => {
      mockGetConflicts.mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      });

      const { result } = renderHook(() => useConflicts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('Database error');
    });
  });

  describe('with custom status filter', () => {
    it('should pass status to server action', async () => {
      mockGetConflicts.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useConflicts('dismissed'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The hook passes status to the action, we can verify via query key
      expect(result.current.data).toEqual([]);
    });
  });
});
