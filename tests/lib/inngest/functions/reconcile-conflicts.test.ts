import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStepRun = vi.fn((name: string, fn: () => Promise<unknown>) => fn())

let mockQueryLog: Array<{ method: string; args: unknown[] }> = []
let mockCandidateNotes: Array<{
  id: string
  user_id: string
  embedding_content_hash: string | null
}> = []
let mockHashLookupNotes: Array<{
  id: string
  embedding_content_hash: string | null
  embedding_status?: string
  deleted_at?: string | null
}> = []
let mockExistingJudgments: Array<{
  user_id: string
  note_a_id: string
  note_b_id: string
  pair_content_hash: string
}> = []
let mockRpcCandidatesByNoteId: Record<
  string,
  Array<{ note_id: string; similarity: number }>
> = {}

const createReconcileConflictsMockSupabaseClient = () => ({
  from: vi.fn((table: string) => {
    if (table === 'notes') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            mockQueryLog.push({ method: 'notes.select.eq', args: [field, value] })

            return {
              not: vi.fn((notField: string, operator: string, notValue: unknown) => {
                mockQueryLog.push({
                  method: 'notes.select.eq.not',
                  args: [notField, operator, notValue],
                })

                return {
                  is: vi.fn((isField: string, isValue: null) => {
                    mockQueryLog.push({
                      method: 'notes.select.eq.not.is',
                      args: [isField, isValue],
                    })

                    return {
                      order: vi.fn((orderField: string, orderOptions: unknown) => {
                        mockQueryLog.push({
                          method: 'notes.select.eq.not.is.order',
                          args: [orderField, orderOptions],
                        })

                        return {
                          limit: vi.fn((limitValue: number) => {
                            mockQueryLog.push({
                              method: 'notes.select.eq.not.is.order.limit',
                              args: [limitValue],
                            })

                            return Promise.resolve({
                              data: mockCandidateNotes,
                              error: null,
                            })
                          }),
                        }
                      }),
                    }
                  }),
                }
              }),
            }
          }),
          in: vi.fn((field: string, values: string[]) => {
            mockQueryLog.push({ method: 'notes.select.in', args: [field, values] })

            return {
              eq: vi.fn((eqField: string, eqValue: string) => {
                mockQueryLog.push({
                  method: 'notes.select.in.eq',
                  args: [eqField, eqValue],
                })

                return {
                  not: vi.fn((notField: string, operator: string, notValue: unknown) => {
                    mockQueryLog.push({
                      method: 'notes.select.in.eq.not',
                      args: [notField, operator, notValue],
                    })

                    return {
                      is: vi.fn((isField: string, isValue: null) => {
                        mockQueryLog.push({
                          method: 'notes.select.in.eq.not.is',
                          args: [isField, isValue],
                        })

                        return Promise.resolve({
                          data: mockHashLookupNotes.filter(
                            (note) =>
                              values.includes(note.id) &&
                              note.embedding_status === 'completed' &&
                              note.embedding_content_hash !== null &&
                              (note.deleted_at === undefined ||
                                note.deleted_at === null)
                          ),
                          error: null,
                        })
                      }),
                    }
                  }),
                }
              }),
            }
          }),
        })),
      }
    }

    if (table === 'conflict_judgments') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((userField: string, userValue: string) => {
            mockQueryLog.push({
              method: 'conflict_judgments.select.eq',
              args: [userField, userValue],
            })

            return {
              in: vi.fn((firstField: string, firstValues: string[]) => {
                mockQueryLog.push({
                  method: 'conflict_judgments.select.in',
                  args: [firstField, firstValues],
                })

                return {
                  in: vi.fn((secondField: string, secondValues: string[]) => {
                    mockQueryLog.push({
                      method: 'conflict_judgments.select.in',
                      args: [secondField, secondValues],
                    })

                    return {
                      in: vi.fn((thirdField: string, thirdValues: string[]) => {
                        mockQueryLog.push({
                          method: 'conflict_judgments.select.in',
                          args: [thirdField, thirdValues],
                        })

                        const filters = {
                          [userField]: [userValue],
                          [firstField]: firstValues,
                          [secondField]: secondValues,
                          [thirdField]: thirdValues,
                        } as Record<string, string[]>

                        return Promise.resolve({
                          data: mockExistingJudgments.filter(
                            (judgment) =>
                              (!filters.user_id ||
                                filters.user_id.includes(judgment.user_id)) &&
                              (!filters.note_a_id ||
                                filters.note_a_id.includes(judgment.note_a_id)) &&
                              (!filters.note_b_id ||
                                filters.note_b_id.includes(judgment.note_b_id)) &&
                              (!filters.pair_content_hash ||
                                filters.pair_content_hash.includes(
                                  judgment.pair_content_hash
                                ))
                          ),
                          error: null,
                        })
                      }),
                    }
                  }),
                }
              }),
            }
          }),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  }),
  rpc: vi.fn((name: string, params: { target_note_id: string }) => {
    mockQueryLog.push({ method: `rpc.${name}`, args: [params] })

    if (name === 'find_potential_conflicts') {
      return Promise.resolve({
        data: mockRpcCandidatesByNoteId[params.target_note_id] || [],
        error: null,
      })
    }

    return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } })
  }),
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createReconcileConflictsMockSupabaseClient()),
}))

vi.mock('inngest', () => {
  class MockEventSchemas {
    fromRecord() {
      return {}
    }
  }

  class MockNonRetriableError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NonRetriableError'
    }
  }

  class MockInngest {
    createFunction(config: unknown, trigger: unknown, handler: unknown) {
      return { config, trigger, handler }
    }
  }

  return {
    EventSchemas: MockEventSchemas,
    Inngest: MockInngest,
    NonRetriableError: MockNonRetriableError,
  }
})

describe('reconcileConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    mockQueryLog = []
    mockCandidateNotes = []
    mockHashLookupNotes = []
    mockExistingJudgments = []
    mockRpcCandidatesByNoteId = {}
  })

  describe('configuration', () => {
    it('should be exported and configured correctly', async () => {
      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      expect(reconcileConflicts).toBeDefined()
      expect(reconcileConflicts.config).toEqual({
        id: 'reconcile-conflicts',
        name: 'Reconcile Conflict Detection',
      })
    })

    it('should trigger on cron schedule every 10 minutes', async () => {
      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      expect(reconcileConflicts.trigger).toEqual({
        cron: '*/10 * * * *',
      })
    })
  })

  describe('reconciliation behavior', () => {
    it('should return early when no notes are eligible', async () => {
      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: [] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{ reconciled: number; message: string }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.reconciled).toBe(0)
      expect(result.message).toContain('No notes eligible')
      expect(mockStepSendEvent).not.toHaveBeenCalled()
    })

    it('should return early when no candidate pairs are found', async () => {
      mockCandidateNotes = [
        { id: 'note-1', user_id: 'user-1', embedding_content_hash: 'hash-1' },
        { id: 'note-2', user_id: 'user-1', embedding_content_hash: 'hash-2' },
      ]
      mockRpcCandidatesByNoteId = {
        'note-1': [],
        'note-2': [],
      }

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: [] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{ reconciled: number; candidatePairs: number; message: string }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.reconciled).toBe(0)
      expect(result.candidatePairs).toBe(0)
      expect(result.message).toContain('No candidate pairs found')
      expect(mockStepSendEvent).not.toHaveBeenCalled()
    })

    it('should not skip an unjudged pair just because the note has other judgments', async () => {
      mockCandidateNotes = [
        { id: 'note-1', user_id: 'user-1', embedding_content_hash: 'hash-1' },
        { id: 'note-2', user_id: 'user-1', embedding_content_hash: 'hash-2' },
      ]
      mockRpcCandidatesByNoteId = {
        'note-1': [{ note_id: 'note-2', similarity: 0.92 }],
        'note-2': [{ note_id: 'note-1', similarity: 0.92 }],
      }
      mockExistingJudgments = [
        {
          user_id: 'user-1',
          note_a_id: 'note-1',
          note_b_id: 'note-3',
          pair_content_hash: 'other-pair-hash',
        },
      ]

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: ['evt-1'] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{
        reconciled: number
        candidates: number
        candidatePairs: number
        uniquePairs: number
        unjudgedPairs: number
      }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.candidates).toBe(2)
      expect(result.candidatePairs).toBe(2)
      expect(result.uniquePairs).toBe(1)
      expect(result.unjudgedPairs).toBe(1)
      expect(result.reconciled).toBe(1)

      const payload = mockStepSendEvent.mock.calls[0]?.[1] as Array<{
        data: { noteId: string; contentHash: string }
      }>
      expect(payload).toHaveLength(1)
      expect(payload[0]?.data).toEqual({
        noteId: 'note-1',
        contentHash: 'hash-1',
      })
    })

    it('should not emit events when every candidate pair already has a judgment', async () => {
      mockCandidateNotes = [
        { id: 'note-1', user_id: 'user-1', embedding_content_hash: 'hash-1' },
        { id: 'note-2', user_id: 'user-1', embedding_content_hash: 'hash-2' },
      ]
      mockRpcCandidatesByNoteId = {
        'note-1': [{ note_id: 'note-2', similarity: 0.88 }],
      }

      const { computePairHash } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )
      const pairHash = computePairHash('hash-1', 'hash-2', 'note-1', 'note-2')
      mockExistingJudgments = [
        {
          user_id: 'user-1',
          note_a_id: 'note-1',
          note_b_id: 'note-2',
          pair_content_hash: pairHash,
        },
      ]

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: [] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{ reconciled: number; uniquePairs: number; message: string }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.reconciled).toBe(0)
      expect(result.uniquePairs).toBe(1)
      expect(result.message).toContain('already have conflict judgments')
      expect(mockStepSendEvent).not.toHaveBeenCalled()
      expect(mockQueryLog).toContainEqual({
        method: 'conflict_judgments.select.eq',
        args: ['user_id', 'user-1'],
      })
    })

    it('should re-emit a note when only some of its pairs have already been judged', async () => {
      mockCandidateNotes = [
        { id: 'note-1', user_id: 'user-1', embedding_content_hash: 'hash-1' },
        { id: 'note-2', user_id: 'user-1', embedding_content_hash: 'hash-2' },
        { id: 'note-3', user_id: 'user-1', embedding_content_hash: 'hash-3' },
      ]
      mockRpcCandidatesByNoteId = {
        'note-1': [
          { note_id: 'note-2', similarity: 0.91 },
          { note_id: 'note-3', similarity: 0.87 },
        ],
      }

      const { computePairHash } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )
      mockExistingJudgments = [
        {
          user_id: 'user-1',
          note_a_id: 'note-1',
          note_b_id: 'note-2',
          pair_content_hash: computePairHash(
            'hash-1',
            'hash-2',
            'note-1',
            'note-2'
          ),
        },
      ]

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: ['evt-1'] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{
        reconciled: number
        uniquePairs: number
        unjudgedPairs: number
      }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.uniquePairs).toBe(2)
      expect(result.unjudgedPairs).toBe(1)
      expect(result.reconciled).toBe(1)

      const payload = mockStepSendEvent.mock.calls[0]?.[1] as Array<{
        id?: string
        data: { noteId: string }
      }>
      expect(payload[0]?.id).toBeUndefined()
      expect(payload.map((event) => event.data.noteId)).toEqual(['note-1'])
    })

    it('should fetch hashes for candidates outside the initial batch', async () => {
      mockCandidateNotes = [
        { id: 'note-1', user_id: 'user-1', embedding_content_hash: 'hash-1' },
      ]
      mockRpcCandidatesByNoteId = {
        'note-1': [{ note_id: 'note-99', similarity: 0.82 }],
      }
      mockHashLookupNotes = [
        {
          id: 'note-99',
          embedding_content_hash: 'hash-99',
          embedding_status: 'completed',
          deleted_at: null,
        },
      ]

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: ['evt-1'] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{ reconciled: number }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.reconciled).toBe(1)
      expect(
        mockQueryLog.find((entry) => entry.method === 'notes.select.in')
      ).toBeDefined()
    })
  })

  describe('environment validation', () => {
    it('should require NEXT_PUBLIC_SUPABASE_URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: (id: string, payload: unknown) => unknown }
      }) => Promise<unknown>

      await expect(
        handler({
          step: { run: mockStepRun, sendEvent: vi.fn() },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })

    it('should require SUPABASE_SERVICE_ROLE_KEY', async () => {
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: (id: string, payload: unknown) => unknown }
      }) => Promise<unknown>

      await expect(
        handler({
          step: { run: mockStepRun, sendEvent: vi.fn() },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })
  })
})
