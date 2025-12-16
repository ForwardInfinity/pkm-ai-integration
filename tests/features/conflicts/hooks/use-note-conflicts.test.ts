import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useNoteConflicts } from '@/features/conflicts/hooks/use-note-conflicts';

const mockGetNoteConflicts = vi.fn();

vi.mock('@/features/conflicts/actions/get-note-conflicts', () => ({
  getNoteConflicts: (noteId: string) => mockGetNoteConflicts(noteId),
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

describe('useNoteConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when noteId is null', () => {
    it('should not fetch and return undefined data', async () => {
      const { result } = renderHook(() => useNoteConflicts(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(mockGetNoteConflicts).not.toHaveBeenCalled();
    });
  });

  describe('when noteId is "new"', () => {
    it('should not fetch conflicts', async () => {
      const { result } = renderHook(() => useNoteConflicts('new'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetNoteConflicts).not.toHaveBeenCalled();
    });
  });

  describe('when noteId is valid', () => {
    it('should fetch conflicts for the note', async () => {
      const mockConflicts = [
        {
          id: 'conflict-1',
          explanation: 'Contradiction',
          conflict_type: 'contradiction',
          otherNoteId: 'note-2',
          otherNoteTitle: 'Other Note',
        },
      ];

      mockGetNoteConflicts.mockResolvedValueOnce({
        success: true,
        data: mockConflicts,
      });

      const { result } = renderHook(() => useNoteConflicts('note-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetNoteConflicts).toHaveBeenCalledWith('note-1');
      expect(result.current.data).toEqual(mockConflicts);
    });

    it('should handle empty conflicts list', async () => {
      mockGetNoteConflicts.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useNoteConflicts('note-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockGetNoteConflicts.mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      });

      const { result } = renderHook(() => useNoteConflicts('note-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('Database error');
    });

    it('should return empty array when data is null', async () => {
      mockGetNoteConflicts.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const { result } = renderHook(() => useNoteConflicts('note-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });
});
