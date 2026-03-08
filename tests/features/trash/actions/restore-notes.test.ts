import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockSend,
  mockUpdate,
  mockIn,
  mockNot,
  mockSelect,
  mockState,
} = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockUpdate: vi.fn(),
  mockIn: vi.fn(),
  mockNot: vi.fn(),
  mockSelect: vi.fn(),
  mockState: {
    updatedNotes: [] as Array<{
      id: string
      embedding_status: string
      embedding_content_hash: string | null
    }>,
    updateError: null as { message: string } | null,
  },
}))

vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: mockSend,
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => ({
      update: (data: Record<string, unknown>) => {
        mockUpdate(table, data)

        return {
          in: (field: string, values: string[]) => {
            mockIn(field, values)

            return {
              not: (notField: string, operator: string, notValue: null) => {
                mockNot(notField, operator, notValue)

                return {
                  select: (columns: string) => {
                    mockSelect(columns)

                    return Promise.resolve({
                      data: mockState.updatedNotes,
                      error: mockState.updateError,
                    })
                  },
                }
              },
            }
          },
        }
      },
    }),
  }),
}))

import { restoreNote, restoreNotes } from '@/features/trash/actions/restore-notes'

describe('restoreNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.updatedNotes = []
    mockState.updateError = null
  })

  it('should enqueue conflict detection again for restored notes with completed embeddings', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
    ]

    const result = await restoreNote('note-1')

    expect(result).toEqual({
      success: true,
      restored: 1,
      queuedConflictDetections: 1,
    })
    expect(mockSend).toHaveBeenCalledWith([
      {
        name: 'note/conflicts.detection.requested',
        data: {
          noteId: 'note-1',
          contentHash: 'hash-1',
        },
      },
    ])
    expect(mockUpdate).toHaveBeenCalledWith('notes', { deleted_at: null })
    expect(mockIn).toHaveBeenCalledWith('id', ['note-1'])
    expect(mockNot).toHaveBeenCalledWith('deleted_at', 'is', null)
    expect(mockSelect).toHaveBeenCalledWith(
      'id, embedding_status, embedding_content_hash'
    )
  })

  it('should only enqueue detection for restored notes that are ready for conflict detection', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
      {
        id: 'note-2',
        embedding_status: 'pending',
        embedding_content_hash: 'hash-2',
      },
      {
        id: 'note-3',
        embedding_status: 'completed',
        embedding_content_hash: null,
      },
    ]

    const result = await restoreNotes(['note-1', 'note-2', 'note-3'])

    expect(result).toEqual({
      success: true,
      restored: 3,
      queuedConflictDetections: 1,
    })
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith([
      {
        name: 'note/conflicts.detection.requested',
        data: {
          noteId: 'note-1',
          contentHash: 'hash-1',
        },
      },
    ])
  })

  it('should not send events when no restored note is eligible for conflict detection', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-2',
        embedding_status: 'pending',
        embedding_content_hash: 'hash-2',
      },
    ]

    const result = await restoreNotes(['note-2'])

    expect(result).toEqual({
      success: true,
      restored: 1,
      queuedConflictDetections: 0,
    })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('should return a failed result when the restore update fails', async () => {
    mockState.updateError = { message: 'Restore failed' }

    const result = await restoreNotes(['note-1'])

    expect(result).toEqual({
      success: false,
      restored: 0,
      queuedConflictDetections: 0,
      error: 'Restore failed',
    })
    expect(mockSend).not.toHaveBeenCalled()
  })
})
