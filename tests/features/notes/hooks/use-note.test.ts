import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useNote } from '@/features/notes/hooks/use-note'

const mockSingle = vi.fn()
const mockIs = vi.fn(() => ({ single: mockSingle }))
const mockEq = vi.fn(() => ({ is: mockIs }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
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

describe('useNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when noteId is new', async () => {
    const { result } = renderHook(() => useNote('new'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('does not fetch when noteId is a temp id', async () => {
    const { result } = renderHook(() => useNote('temp_abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('fetches persisted notes', async () => {
    const note = {
      id: 'note-123',
      user_id: 'user-1',
      title: 'Persisted note',
      problem: null,
      content: 'content',
      tags: [],
      is_pinned: false,
      word_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
      embedding: null,
      fts: null,
    }
    mockSingle.mockResolvedValueOnce({ data: note, error: null })

    const { result } = renderHook(() => useNote('note-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockFrom).toHaveBeenCalledWith('notes')
    expect(mockEq).toHaveBeenCalledWith('id', 'note-123')
    expect(result.current.data).toEqual(note)
  })
})
