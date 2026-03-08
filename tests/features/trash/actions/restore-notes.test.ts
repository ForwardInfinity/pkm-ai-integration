import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockSend,
  mockConflictUpsert,
  mockUpdate,
  mockIn,
  mockNot,
  mockSelect,
  mockState,
} = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockConflictUpsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockIn: vi.fn(),
  mockNot: vi.fn(),
  mockSelect: vi.fn(),
  mockState: {
    updatedNotes: [] as Array<{
      id: string
      user_id: string
      embedding_status: string
      embedding_content_hash: string | null
    }>,
    updateError: null as { message: string } | null,
    // Rehydration mock data
    judgments: [] as Array<{
      note_a_id: string
      note_b_id: string
      pair_content_hash: string
      judgment_result: string
      confidence: number
      explanation: string
      reasoning: string
    }>,
    otherNotes: [] as Array<{
      id: string
      embedding_content_hash: string
    }>,
    existingConflicts: [] as Array<{
      note_a_id: string
      note_b_id: string
      pair_content_hash: string
      status: string
    }>,
    upsertError: null as { message: string } | null,
  },
}))

vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: mockSend,
  },
}))

// Mock computePairHash to return a deterministic value for testing
vi.mock('@/lib/inngest/functions/conflict-pair-utils', () => ({
  computePairHash: (hashA: string, hashB: string, idA: string, idB: string) => {
    const [first, second] = idA < idB ? [hashA, hashB] : [hashB, hashA]
    return `pair:${first}:${second}`
  },
  getCanonicalPairIds: (idA: string, idB: string) =>
    idA < idB ? [idA, idB] : [idB, idA],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => {
      if (table === 'conflict_judgments') {
        return {
          select: () => ({
            or: () => ({
              in: () => ({
                gte: () =>
                  Promise.resolve({
                    data: mockState.judgments,
                    error: null,
                  }),
              }),
            }),
          }),
        }
      }

      if (table === 'conflicts') {
        return {
          select: () => ({
            eq: (firstField: string, firstValue: string) => ({
              eq: (secondField: string, secondValue: string) =>
                Promise.resolve({
                  data: mockState.existingConflicts.filter(
                    (conflict) =>
                      conflict[firstField as 'note_a_id' | 'note_b_id'] ===
                        firstValue &&
                      conflict[secondField as 'note_a_id' | 'note_b_id'] ===
                        secondValue
                  ),
                  error: null,
                }),
            }),
          }),
          upsert: (...args: unknown[]) => {
            mockConflictUpsert(...args)
            return Promise.resolve({ error: mockState.upsertError })
          },
        }
      }

      // table === 'notes'
      return {
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
        select: () => ({
          in: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({
                  data: mockState.otherNotes,
                  error: null,
                }),
            }),
          }),
        }),
      }
    },
  }),
}))

import { restoreNote, restoreNotes } from '@/features/trash/actions/restore-notes'

describe('restoreNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.updatedNotes = []
    mockState.updateError = null
    mockState.judgments = []
    mockState.otherNotes = []
    mockState.existingConflicts = []
    mockState.upsertError = null
  })

  it('should enqueue conflict detection again for restored notes with completed embeddings', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
    ]

    const result = await restoreNote('note-1')

    expect(result).toEqual({
      success: true,
      restored: 1,
      rehydratedConflicts: 0,
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
      'id, user_id, embedding_status, embedding_content_hash'
    )
  })

  it('should only enqueue detection for restored notes that are ready for conflict detection', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
      {
        id: 'note-2',
        user_id: 'user-1',
        embedding_status: 'pending',
        embedding_content_hash: 'hash-2',
      },
      {
        id: 'note-3',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: null,
      },
    ]

    const result = await restoreNotes(['note-1', 'note-2', 'note-3'])

    expect(result).toEqual({
      success: true,
      restored: 3,
      rehydratedConflicts: 0,
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
        user_id: 'user-1',
        embedding_status: 'pending',
        embedding_content_hash: 'hash-2',
      },
    ]

    const result = await restoreNotes(['note-2'])

    expect(result).toEqual({
      success: true,
      restored: 1,
      rehydratedConflicts: 0,
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
      rehydratedConflicts: 0,
      queuedConflictDetections: 0,
      error: 'Restore failed',
    })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('should rehydrate conflicts from prior judgments when pair hash matches', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
    ]

    // Simulate an existing judgment for (note-1, note-2)
    mockState.judgments = [
      {
        note_a_id: 'note-1',
        note_b_id: 'note-2',
        pair_content_hash: 'pair:hash-1:hash-2', // matches mock computePairHash
        judgment_result: 'tension',
        confidence: 0.85,
        explanation: 'These notes contradict',
        reasoning: 'Internal reasoning',
      },
    ]

    mockState.otherNotes = [
      {
        id: 'note-2',
        embedding_content_hash: 'hash-2',
      },
    ]

    const result = await restoreNote('note-1')

    expect(result).toEqual({
      success: true,
      restored: 1,
      rehydratedConflicts: 1,
      queuedConflictDetections: 1,
    })
    expect(mockConflictUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        note_a_id: 'note-1',
        note_b_id: 'note-2',
        pair_content_hash: 'pair:hash-1:hash-2',
        status: 'active',
      }),
      { onConflict: 'note_a_id,note_b_id' }
    )
  })

  it('should NOT rehydrate conflicts when pair content hash does not match current content', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1-CHANGED',
      },
    ]

    // Judgment has old pair hash
    mockState.judgments = [
      {
        note_a_id: 'note-1',
        note_b_id: 'note-2',
        pair_content_hash: 'pair:hash-1-OLD:hash-2',
        judgment_result: 'contradiction',
        confidence: 0.9,
        explanation: 'Stale judgment',
        reasoning: 'Internal',
      },
    ]

    mockState.otherNotes = [
      { id: 'note-2', embedding_content_hash: 'hash-2' },
    ]

    const result = await restoreNote('note-1')

    // Should not rehydrate because pair hash doesn't match
    expect(result.rehydratedConflicts).toBe(0)
  })

  it('should NOT rehydrate conflicts when confidence is below threshold', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
    ]

    // Low confidence judgment — the .gte filter in the query would exclude it
    // so the mock returns empty
    mockState.judgments = []
    mockState.otherNotes = []

    const result = await restoreNote('note-1')

    expect(result.rehydratedConflicts).toBe(0)
  })

  it('should preserve a dismissed conflict when the dismissal matches the current pair hash', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
    ]
    mockState.judgments = [
      {
        note_a_id: 'note-1',
        note_b_id: 'note-2',
        pair_content_hash: 'pair:hash-1:hash-2',
        judgment_result: 'tension',
        confidence: 0.9,
        explanation: 'Still conflicts',
        reasoning: 'Internal reasoning',
      },
    ]
    mockState.otherNotes = [{ id: 'note-2', embedding_content_hash: 'hash-2' }]
    mockState.existingConflicts = [
      {
        note_a_id: 'note-1',
        note_b_id: 'note-2',
        pair_content_hash: 'pair:hash-1:hash-2',
        status: 'dismissed',
      },
    ]

    const result = await restoreNote('note-1')

    expect(result.rehydratedConflicts).toBe(0)
    expect(mockConflictUpsert).not.toHaveBeenCalled()
  })

  it('should reactivate a dismissed conflict when the stored dismissal is for an older pair hash', async () => {
    mockState.updatedNotes = [
      {
        id: 'note-1',
        user_id: 'user-1',
        embedding_status: 'completed',
        embedding_content_hash: 'hash-1',
      },
    ]
    mockState.judgments = [
      {
        note_a_id: 'note-1',
        note_b_id: 'note-2',
        pair_content_hash: 'pair:hash-1:hash-2',
        judgment_result: 'contradiction',
        confidence: 0.92,
        explanation: 'Current contradiction',
        reasoning: 'Internal reasoning',
      },
    ]
    mockState.otherNotes = [{ id: 'note-2', embedding_content_hash: 'hash-2' }]
    mockState.existingConflicts = [
      {
        note_a_id: 'note-1',
        note_b_id: 'note-2',
        pair_content_hash: 'pair:hash-1-OLD:hash-2',
        status: 'dismissed',
      },
    ]

    const result = await restoreNote('note-1')

    expect(result.rehydratedConflicts).toBe(1)
    expect(mockConflictUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        pair_content_hash: 'pair:hash-1:hash-2',
        status: 'active',
      }),
      { onConflict: 'note_a_id,note_b_id' }
    )
  })
})
