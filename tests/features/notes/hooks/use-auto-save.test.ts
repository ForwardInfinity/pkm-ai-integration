import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalNote } from '@/lib/local-db'

const mockMergeNoteLocally = vi.fn()
const mockEnqueue = vi.fn()
const mockAddListener = vi.fn(() => vi.fn())
const mockGetServerIdForTempId = vi.fn()
const mockSetQueryData = vi.fn()

vi.mock('@/lib/local-db/note-cache', () => ({
  mergeNoteLocally: (...args: unknown[]) => mockMergeNoteLocally(...args),
}))

vi.mock('@/lib/local-db/sync-queue', () => ({
  getSyncQueue: () => ({
    enqueue: mockEnqueue,
    addListener: mockAddListener,
    getServerIdForTempId: mockGetServerIdForTempId,
  }),
}))

vi.mock('@/lib/query-client', () => ({
  getBrowserQueryClient: () => ({
    setQueryData: mockSetQueryData,
  }),
}))

import { useAutoSave } from '@/features/notes/hooks/use-auto-save'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnqueue.mockResolvedValue(undefined)
    mockGetServerIdForTempId.mockReturnValue(undefined)
  })

  it('saves local notes with tags', async () => {
    mockMergeNoteLocally.mockResolvedValue({
      id: 'temp_123',
      title: '',
      problem: null,
      content: 'Draft with #tag',
      wordCount: 3,
      tags: ['tag'],
      updatedAt: Date.now(),
      syncStatus: 'pending',
      tempId: 'temp_123',
    } satisfies LocalNote)

    const { result } = renderHook(() => useAutoSave({ noteId: 'temp_123' }))

    await act(async () => {
      await result.current.save({
        content: 'Draft with #tag',
        wordCount: 3,
        tags: ['tag'],
      })
    })

    expect(mockMergeNoteLocally).toHaveBeenCalledWith(
      'temp_123',
      {
        content: 'Draft with #tag',
        wordCount: 3,
        tags: ['tag'],
      },
      { seed: undefined }
    )
    expect(mockEnqueue).toHaveBeenCalledWith('temp_123', {
      content: 'Draft with #tag',
      wordCount: 3,
      tags: ['tag'],
    })
  })

  it('seeds the first persisted save with the current server snapshot', async () => {
    mockMergeNoteLocally.mockResolvedValue({
      id: 'note-123',
      title: 'Recovered title',
      problem: null,
      content: 'Server content',
      wordCount: 2,
      tags: ['tag'],
      updatedAt: Date.now(),
      syncStatus: 'pending',
      serverVersion: '2024-01-01T00:00:00Z',
    } satisfies LocalNote)

    const { result } = renderHook(() =>
      useAutoSave({
        noteId: 'note-123',
        serverSnapshot: {
          title: 'Server title',
          problem: null,
          content: 'Server content',
          wordCount: 2,
          tags: ['tag'],
          serverVersion: '2024-01-01T00:00:00Z',
        },
      })
    )

    await act(async () => {
      await result.current.save({
        title: 'Recovered title',
      })
    })

    expect(mockMergeNoteLocally).toHaveBeenCalledWith(
      'note-123',
      { title: 'Recovered title' },
      {
        seed: {
          title: 'Server title',
          problem: null,
          content: 'Server content',
          wordCount: 2,
          tags: ['tag'],
          serverVersion: '2024-01-01T00:00:00Z',
        },
      }
    )
  })
})
