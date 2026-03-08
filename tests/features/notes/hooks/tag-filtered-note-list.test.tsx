import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeleteNote, useUpdateNote } from '@/features/notes/hooks/use-note-mutations'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { tagKeys, useNotesByTags } from '@/features/notes/hooks/use-tags'
import type { Note, NoteListItem } from '@/features/notes/types'
import { useRestoreNote } from '@/features/trash/hooks/use-trash-mutations'
import { trashKeys } from '@/features/trash/hooks'

const {
  mockRemoveNote,
  mockRestoreNoteAction,
  mockState,
} = vi.hoisted(() => ({
  mockRemoveNote: vi.fn(),
  mockRestoreNoteAction: vi.fn(),
  mockState: {
    filteredNotes: [] as NoteListItem[],
    updatedNote: null as Note | null,
    updateError: null as { message: string } | null,
    deleteError: null as { message: string } | null,
  },
}))

vi.mock('@/lib/local-db/sync-queue', () => ({
  getSyncQueue: () => ({
    removeNote: mockRemoveNote,
  }),
}))

vi.mock('@/features/trash/actions/restore-notes', () => ({
  restoreNote: (...args: unknown[]) => mockRestoreNoteAction(...args),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: vi.fn((fn: string) => {
      if (fn === 'get_notes_by_tags') {
        return Promise.resolve({ data: mockState.filteredNotes, error: null })
      }

      if (fn === 'get_all_tags') {
        return Promise.resolve({ data: [], error: null })
      }

      return Promise.resolve({
        data: null,
        error: { message: `Unexpected RPC: ${fn}` },
      })
    }),
    from: vi.fn(() => ({
      update: vi.fn((payload: Record<string, unknown>) => ({
        eq: vi.fn(() => {
          if ('deleted_at' in payload) {
            return Promise.resolve({ error: mockState.deleteError })
          }

          return {
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: mockState.updatedNote,
                  error: mockState.updateError,
                })
              ),
            })),
          }
        }),
      })),
    })),
  }),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function createNoteListItem(overrides: Partial<NoteListItem> = {}): NoteListItem {
  return {
    id: 'note-1',
    title: 'Tagged note',
    problem: 'Problem',
    tags: ['science'],
    is_pinned: false,
    updated_at: '2024-01-01T00:00:00Z',
    word_count: 42,
    ...overrides,
  }
}

function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    user_id: 'user-1',
    title: 'Tagged note',
    problem: 'Problem',
    content: '#science',
    tags: ['science'],
    is_pinned: false,
    word_count: 42,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
    embedding: null,
    embedding_content_hash: null,
    embedding_error: null,
    embedding_model: null,
    embedding_requested_at: null,
    embedding_status: 'pending',
    embedding_updated_at: null,
    fts: null,
    ...overrides,
  }
}

describe('tag-filtered note list mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRemoveNote.mockResolvedValue(undefined)
    mockRestoreNoteAction.mockResolvedValue({
      success: true,
      restored: 1,
      queuedConflictDetections: 0,
    })
    mockState.filteredNotes = []
    mockState.updatedNote = null
    mockState.updateError = null
    mockState.deleteError = null
  })

  it('removes a note from the active filtered list after its tags change', async () => {
    const queryClient = createQueryClient()
    const note = createNote()
    const filteredNote = createNoteListItem()

    mockState.filteredNotes = [filteredNote]
    mockState.updatedNote = createNote({
      tags: ['math'],
      content: '#math',
      updated_at: '2024-01-02T00:00:00Z',
    })

    const wrapper = createWrapper(queryClient)
    const filteredQuery = renderHook(() => useNotesByTags(['science']), { wrapper })
    const updateMutation = renderHook(() => useUpdateNote(), { wrapper })

    queryClient.setQueryData(noteKeys.lists(), [filteredNote])
    queryClient.setQueryData(noteKeys.detail(note.id), note)

    await waitFor(() => {
      expect(filteredQuery.result.current.data).toEqual([filteredNote])
    })

    mockState.filteredNotes = []

    await act(async () => {
      await updateMutation.result.current.mutateAsync({
        id: note.id,
        tags: ['math'],
        content: '#math',
      })
    })

    await waitFor(() => {
      expect(filteredQuery.result.current.data).toEqual([])
    })
  })

  it('removes a deleted note from the active filtered list', async () => {
    const queryClient = createQueryClient()
    const filteredNote = createNoteListItem()

    mockState.filteredNotes = [filteredNote]

    const wrapper = createWrapper(queryClient)
    const filteredQuery = renderHook(() => useNotesByTags(['science']), { wrapper })
    const deleteMutation = renderHook(() => useDeleteNote(), { wrapper })

    queryClient.setQueryData(noteKeys.lists(), [filteredNote])
    queryClient.setQueryData(tagKeys.byTags(['science']), [filteredNote])
    queryClient.setQueryData(trashKeys.list(), [])

    await waitFor(() => {
      expect(filteredQuery.result.current.data).toEqual([filteredNote])
    })

    mockState.filteredNotes = []

    await act(async () => {
      await deleteMutation.result.current.mutateAsync(filteredNote.id)
    })

    await waitFor(() => {
      expect(filteredQuery.result.current.data).toEqual([])
    })
  })

  it('adds a restored note back into the active filtered list', async () => {
    const queryClient = createQueryClient()
    const restoredNote = createNoteListItem()

    mockState.filteredNotes = []

    const wrapper = createWrapper(queryClient)
    const filteredQuery = renderHook(() => useNotesByTags(['science']), { wrapper })
    const restoreMutation = renderHook(() => useRestoreNote(), { wrapper })

    queryClient.setQueryData(noteKeys.lists(), [])
    queryClient.setQueryData(trashKeys.list(), [
      {
        id: restoredNote.id,
        title: restoredNote.title,
        problem: restoredNote.problem,
        deleted_at: '2024-01-03T00:00:00Z',
        word_count: restoredNote.word_count,
      },
    ])

    await waitFor(() => {
      expect(filteredQuery.result.current.data).toEqual([])
    })

    mockState.filteredNotes = [restoredNote]

    await act(async () => {
      await restoreMutation.result.current.mutateAsync(restoredNote.id)
    })

    await waitFor(() => {
      expect(filteredQuery.result.current.data).toEqual([restoredNote])
    })
  })
})
