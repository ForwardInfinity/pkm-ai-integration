import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBulkDeleteNotes } from '@/features/notes/hooks/use-bulk-delete-notes'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { tagKeys } from '@/features/notes/hooks/use-tags'
import { trashKeys } from '@/features/trash/hooks'

const mockRemoveNotes = vi.fn()
const mockGetNoteLocally = vi.fn()

// Track all server calls with their method chain
const serverCalls: Array<{
  type: 'eq' | 'in'
  payload: Record<string, unknown>
  target: string | string[]
}> = []

vi.mock('@/lib/local-db/sync-queue', () => ({
  getSyncQueue: () => ({
    removeNotes: mockRemoveNotes,
  }),
}))

vi.mock('@/lib/local-db/note-cache', () => ({
  getNoteLocally: (...args: unknown[]) => mockGetNoteLocally(...args),
}))

vi.mock('@/lib/local-db/flush-before-delete', async () => {
  const { buildSoftDeletePayload } = await import(
    '@/lib/local-db/flush-before-delete'
  )
  return {
    buildSoftDeletePayload,
    buildSoftDeletePayloadForNote: async (
      noteId: string,
      deletedAt: string
    ) => {
      const localNote = await mockGetNoteLocally(noteId)
      return buildSoftDeletePayload(localNote, deletedAt)
    },
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      update: (payload: Record<string, unknown>) => ({
        eq: (_field: string, id: string) => {
          serverCalls.push({ type: 'eq', payload, target: id })
          return Promise.resolve({ error: null })
        },
        in: (_field: string, ids: string[]) => {
          serverCalls.push({ type: 'in', payload, target: ids })
          return Promise.resolve({ error: null })
        },
      }),
    })),
  }),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useBulkDeleteNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serverCalls.length = 0
    mockRemoveNotes.mockResolvedValue(undefined)
    mockGetNoteLocally.mockResolvedValue(undefined)
  })

  it('cleans local sync state for all deleted notes', async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData(noteKeys.lists(), [
      {
        id: 'note-123',
        title: 'First note',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 10,
      },
      {
        id: 'note-456',
        title: 'Second note',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-02T00:00:00Z',
        word_count: 12,
      },
    ])
    queryClient.setQueryData(noteKeys.detail('note-123'), { id: 'note-123' })
    queryClient.setQueryData(noteKeys.detail('note-456'), { id: 'note-456' })
    queryClient.setQueryData(trashKeys.list(), [])

    const { result } = renderHook(() => useBulkDeleteNotes(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(['note-123', 'note-456'])
    })

    expect(mockRemoveNotes).toHaveBeenCalledWith(['note-123', 'note-456'])
    expect(queryClient.getQueryData(noteKeys.detail('note-123'))).toBeUndefined()
    expect(queryClient.getQueryData(noteKeys.detail('note-456'))).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: tagKeys.listByTagsPrefix(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tagKeys.tags() })
  })

  it('flushes pending local content then issues a single atomic soft-delete', async () => {
    // note-123 has pending changes, note-456 is synced
    mockGetNoteLocally.mockImplementation(async (id: string) => {
      if (id === 'note-123') {
        return {
          id: 'note-123',
          title: 'Unsaved draft',
          problem: 'Draft problem',
          content: '# Draft content',
          wordCount: 3,
          tags: ['wip'],
          updatedAt: Date.now(),
          syncStatus: 'pending',
        }
      }
      return undefined // note-456 has no local state
    })

    const queryClient = createQueryClient()
    queryClient.setQueryData(noteKeys.lists(), [
      {
        id: 'note-123',
        title: 'Old title',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 10,
      },
      {
        id: 'note-456',
        title: 'Second note',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-02T00:00:00Z',
        word_count: 12,
      },
    ])
    queryClient.setQueryData(trashKeys.list(), [])

    const { result } = renderHook(() => useBulkDeleteNotes(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync(['note-123', 'note-456'])
    })

    // Phase 1: content flush for note-123 (no deleted_at)
    const flushCall = serverCalls.find(
      (c) => c.type === 'eq' && c.target === 'note-123'
    )
    expect(flushCall).toBeDefined()
    expect(flushCall!.payload.title).toBe('Unsaved draft')
    expect(flushCall!.payload.content).toBe('# Draft content')
    expect(flushCall!.payload).not.toHaveProperty('deleted_at')

    // Phase 2: single atomic soft-delete for ALL notes
    const deleteCall = serverCalls.find((c) => c.type === 'in')
    expect(deleteCall).toBeDefined()
    expect(deleteCall!.target).toEqual(['note-123', 'note-456'])
    expect(Object.keys(deleteCall!.payload)).toEqual(['deleted_at'])
  })

  it('still performs atomic soft-delete even if content flush fails', async () => {
    // Flush will reject for note-123
    mockGetNoteLocally.mockImplementation(async (id: string) => {
      if (id === 'note-123') throw new Error('IndexedDB failure')
      return undefined
    })

    const queryClient = createQueryClient()
    queryClient.setQueryData(noteKeys.lists(), [
      {
        id: 'note-123',
        title: 'Note',
        problem: null,
        tags: [],
        is_pinned: false,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 1,
      },
    ])
    queryClient.setQueryData(trashKeys.list(), [])

    const { result } = renderHook(() => useBulkDeleteNotes(), {
      wrapper: createWrapper(queryClient),
    })

    // Should NOT throw — flush failure is swallowed
    await act(async () => {
      await result.current.mutateAsync(['note-123'])
    })

    // Atomic delete still happened
    const deleteCall = serverCalls.find((c) => c.type === 'in')
    expect(deleteCall).toBeDefined()
    expect(deleteCall!.target).toEqual(['note-123'])
  })
})
