import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useBacklinks, backlinkKeys } from '@/features/notes/hooks/use-backlinks'

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

describe('useBacklinks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates the expected query key', () => {
    expect(backlinkKeys.all).toEqual(['backlinks'])
    expect(backlinkKeys.list('note-123')).toEqual(['backlinks', 'note-123'])
  })

  it('does not fetch when noteId is null', async () => {
    const { result } = renderHook(() => useBacklinks(null), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeUndefined()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('does not fetch when noteId is a temp id', async () => {
    const { result } = renderHook(() => useBacklinks('temp_abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('fetches backlinks for persisted notes', async () => {
    const backlinks = [{ id: 'note-2', title: 'Backlink', problem: 'Problem' }]
    mockRpc.mockResolvedValueOnce({ data: backlinks, error: null })

    const { result } = renderHook(() => useBacklinks('note-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockRpc).toHaveBeenCalledWith('get_backlinks', {
      p_target_note_id: 'note-123',
    })
    expect(result.current.data).toEqual(backlinks)
  })
})
