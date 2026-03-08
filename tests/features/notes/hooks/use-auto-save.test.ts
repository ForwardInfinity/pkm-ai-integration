import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocalNote } from '@/lib/local-db'

const mockSaveNoteLocally = vi.fn()
const mockGetNoteLocally = vi.fn()
const mockEnqueue = vi.fn()
const mockAddListener = vi.fn(() => vi.fn())
const mockGetServerIdForTempId = vi.fn()
const mockSetQueryData = vi.fn()

vi.mock('@/lib/local-db/note-cache', () => ({
  saveNoteLocally: (...args: unknown[]) => mockSaveNoteLocally(...args),
  getNoteLocally: (...args: unknown[]) => mockGetNoteLocally(...args),
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
    mockSaveNoteLocally.mockResolvedValue(undefined)
    mockGetNoteLocally.mockResolvedValue(undefined)
    mockEnqueue.mockResolvedValue(undefined)
    mockGetServerIdForTempId.mockReturnValue(undefined)
  })

  it('saves local notes with tags', async () => {
    const { result } = renderHook(() => useAutoSave({ noteId: 'temp_123' }))

    await act(async () => {
      await result.current.save({
        content: 'Draft with #tag',
        wordCount: 3,
        tags: ['tag'],
      })
    })

    expect(mockSaveNoteLocally).toHaveBeenCalledWith(expect.objectContaining({
      id: 'temp_123',
      content: 'Draft with #tag',
      wordCount: 3,
      tags: ['tag'],
      syncStatus: 'pending',
      tempId: 'temp_123',
    }))
    expect(mockEnqueue).toHaveBeenCalledWith('temp_123', {
      content: 'Draft with #tag',
      wordCount: 3,
      tags: ['tag'],
    })
  })

  it('preserves existing tags when a later save omits them', async () => {
    const existingNote: LocalNote = {
      id: 'note-123',
      title: 'Existing',
      problem: null,
      content: 'Existing #tag',
      wordCount: 2,
      tags: ['tag'],
      updatedAt: Date.now(),
      syncStatus: 'error',
    }
    mockGetNoteLocally.mockResolvedValue(existingNote)

    const { result } = renderHook(() => useAutoSave({ noteId: 'note-123' }))

    await act(async () => {
      await result.current.save({
        title: 'Recovered title',
      })
    })

    expect(mockSaveNoteLocally).toHaveBeenCalledWith(expect.objectContaining({
      id: 'note-123',
      title: 'Recovered title',
      tags: ['tag'],
    }))
  })
})
