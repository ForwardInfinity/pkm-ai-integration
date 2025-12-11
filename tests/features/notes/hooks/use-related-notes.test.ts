import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import {
  useRelatedNotes,
  relatedNotesKeys,
  DEFAULT_MATCH_COUNT,
  DEFAULT_SIMILARITY_THRESHOLD,
} from '@/features/notes/hooks/use-related-notes'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useRelatedNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('relatedNotesKeys', () => {
    it('should generate correct query keys', () => {
      expect(relatedNotesKeys.all).toEqual(['related-notes'])
      expect(relatedNotesKeys.list('note-123', 5, 0.3)).toEqual([
        'related-notes',
        'note-123',
        5,
        0.3,
      ])
    })

    it('should generate unique keys for different parameters', () => {
      const key1 = relatedNotesKeys.list('note-123', 5, 0.3)
      const key2 = relatedNotesKeys.list('note-123', 10, 0.3)
      const key3 = relatedNotesKeys.list('note-123', 5, 0.5)

      expect(key1).not.toEqual(key2)
      expect(key1).not.toEqual(key3)
    })
  })

  describe('when noteId is null', () => {
    it('should not fetch and return undefined data', async () => {
      const { result } = renderHook(() => useRelatedNotes(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // When disabled, TanStack Query returns undefined; consumers use `data ?? []`
      expect(result.current.data).toBeUndefined()
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('when noteId is "new"', () => {
    it('should not fetch related notes', async () => {
      const { result } = renderHook(() => useRelatedNotes('new'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('when noteId is valid', () => {
    it('should fetch related notes with default parameters', async () => {
      const mockRelatedNotes = [
        { id: 'note-1', title: 'Related Note 1', problem: 'Problem 1', similarity: 0.9 },
        { id: 'note-2', title: 'Related Note 2', problem: null, similarity: 0.8 },
      ]
      mockRpc.mockResolvedValueOnce({ data: mockRelatedNotes, error: null })

      const { result } = renderHook(() => useRelatedNotes('note-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockRpc).toHaveBeenCalledWith('get_related_notes', {
        target_note_id: 'note-123',
        match_count: DEFAULT_MATCH_COUNT,
        match_threshold: DEFAULT_SIMILARITY_THRESHOLD,
      })
      expect(result.current.data).toEqual(mockRelatedNotes)
    })

    it('should use custom matchCount', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const { result } = renderHook(() => useRelatedNotes('note-123', 10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockRpc).toHaveBeenCalledWith('get_related_notes', {
        target_note_id: 'note-123',
        match_count: 10,
        match_threshold: DEFAULT_SIMILARITY_THRESHOLD,
      })
    })

    it('should use custom matchThreshold', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null })

      const { result } = renderHook(() => useRelatedNotes('note-123', 5, 0.5), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockRpc).toHaveBeenCalledWith('get_related_notes', {
        target_note_id: 'note-123',
        match_count: 5,
        match_threshold: 0.5,
      })
    })

    it('should handle API errors', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

      const { result } = renderHook(() => useRelatedNotes('note-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect((result.current.error as Error).message).toBe('Database error')
    })

    it('should return empty array when data is null', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null })

      const { result } = renderHook(() => useRelatedNotes('note-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })
})
