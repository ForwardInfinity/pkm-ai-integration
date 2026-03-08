import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock step.run to execute callbacks immediately
const mockStepRun = vi.fn((name: string, fn: () => Promise<unknown>) => fn())

// Mock judgeNotePair function
const mockJudgeNotePair = vi.fn()

// Track mock calls for verification
let mockSupabaseCallLog: Array<{ method: string; args: unknown[] }> = []

// Configurable mock data
let mockTargetNote: {
  id: string
  user_id: string
  title: string
  problem: string | null
  content: string
  embedding_content_hash: string | null
  embedding_status: string
  deleted_at?: string | null
} | null = null

let mockCandidates: Array<{ note_id: string; similarity: number }> = []
let mockCandidateDetails: Array<{
  id: string
  title: string
  problem: string | null
  content: string
  embedding_content_hash: string | null
  deleted_at?: string | null
}> = []
let mockExistingJudgments: Array<{ pair_content_hash: string }> = []
let mockInsertError: { code: string; message: string } | null = null
let mockUpsertError: { code: string; message: string } | null = null
let mockAfterJudgmentInsert: (() => void) | null = null
let mockAfterConflictUpsert: (() => void) | null = null

// Create mock Supabase client
const createMockSupabaseClient = () => ({
  from: vi.fn((table: string) => {
    if (table === 'notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => ({
              single: vi.fn(() => {
              mockSupabaseCallLog.push({
                method: 'notes.select.eq.single',
                args: [field, value],
              })
              if (mockTargetNote && mockTargetNote.id === value) {
                return Promise.resolve({ data: mockTargetNote, error: null })
              }
              return Promise.resolve({
                data: null,
                error: { message: 'Not found' },
                })
              }),
            })),
            in: vi.fn((field: string, values: string[]) => ({
              is: vi.fn((deletedAtField: string, deletedAtValue: null) => {
                mockSupabaseCallLog.push({
                  method: 'notes.select.in.is',
                  args: [field, values, deletedAtField, deletedAtValue],
                })

                const notePool = [
                  ...(mockTargetNote ? [mockTargetNote] : []),
                  ...mockCandidateDetails,
                ]

                return Promise.resolve({
                  data: notePool.filter(
                    (note) =>
                      values.includes(note.id) &&
                      (note.deleted_at === undefined || note.deleted_at === null)
                  ),
                  error: null,
                })
              }),
            })),
          })),
        }
      }

    if (table === 'conflict_judgments') {
      return {
        select: vi.fn(() => ({
          in: vi.fn((field: string, values: string[]) => {
            mockSupabaseCallLog.push({
              method: 'conflict_judgments.select.in',
              args: [field, values],
            })
            return Promise.resolve({
              data: mockExistingJudgments.filter((j) =>
                values.includes(j.pair_content_hash)
              ),
              error: null,
            })
          }),
        })),
        insert: vi.fn((data: unknown) => {
          mockSupabaseCallLog.push({
            method: 'conflict_judgments.insert',
            args: [data],
          })
          if (mockInsertError) {
            return Promise.resolve({ data: null, error: mockInsertError })
          }
          mockAfterJudgmentInsert?.()
          return Promise.resolve({ data: { id: 'judgment-1' }, error: null })
        }),
        delete: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => ({
            eq: vi.fn((secondField: string, secondValue: string) => ({
              eq: vi.fn((thirdField: string, thirdValue: string) => {
                mockSupabaseCallLog.push({
                  method: 'conflict_judgments.delete',
                  args: [field, value, secondField, secondValue, thirdField, thirdValue],
                })
                return Promise.resolve({ error: null })
              }),
            })),
          })),
        })),
      }
    }

    if (table === 'conflicts') {
      return {
        upsert: vi.fn((data: unknown, options: unknown) => {
          mockSupabaseCallLog.push({
            method: 'conflicts.upsert',
            args: [data, options],
          })
          if (mockUpsertError) {
            return Promise.resolve({ data: null, error: mockUpsertError })
          }
          mockAfterConflictUpsert?.()
          return Promise.resolve({ data: { id: 'conflict-1' }, error: null })
        }),
        delete: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => ({
            eq: vi.fn((secondField: string, secondValue: string) => {
              mockSupabaseCallLog.push({
                method: 'conflicts.delete',
                args: [field, value, secondField, secondValue],
              })
              return Promise.resolve({ error: null })
            }),
          })),
        })),
      }
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'Unknown table' } })
          ),
        })),
      })),
    }
  }),
  rpc: vi.fn((name: string, params: unknown) => {
    mockSupabaseCallLog.push({ method: `rpc.${name}`, args: [params] })
    if (name === 'find_potential_conflicts') {
      return Promise.resolve({ data: mockCandidates, error: null })
    }
    return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } })
  }),
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}))

vi.mock('@/lib/ai/conflict-judgment', () => ({
  judgeNotePair: mockJudgeNotePair,
}))

vi.mock('ai', () => ({
  NoObjectGeneratedError: class NoObjectGeneratedError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NoObjectGeneratedError'
    }
  },
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


describe('detectNoteConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    // Reset test state
    mockSupabaseCallLog = []
    mockTargetNote = null
    mockCandidates = []
    mockCandidateDetails = []
    mockExistingJudgments = []
    mockInsertError = null
    mockUpsertError = null
    mockAfterJudgmentInsert = null
    mockAfterConflictUpsert = null
    mockJudgeNotePair.mockReset()
  })

  describe('configuration', () => {
    it('should be exported and configured correctly', async () => {
      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      expect(detectNoteConflicts).toBeDefined()
      expect(detectNoteConflicts.config).toEqual({
        id: 'detect-note-conflicts',
        name: 'Detect Note Conflicts',
        retries: 3,
        concurrency: { limit: 3 },
      })
    })

    it('should trigger on note/conflicts.detection.requested and note/embedding.completed events', async () => {
      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      expect(detectNoteConflicts.trigger).toEqual([
        { event: 'note/conflicts.detection.requested' },
        { event: 'note/embedding.completed' },
      ])
    })

    it('should have a handler function', async () => {
      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      expect(typeof detectNoteConflicts.handler).toBe('function')
    })
  })

  describe('environment validation', () => {
    it('should require OPENROUTER_API_KEY', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'test-id', contentHash: 'test-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('OPENROUTER_API_KEY environment variable is not set')
    })

    it('should require NEXT_PUBLIC_SUPABASE_URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'test-id', contentHash: 'test-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })

    it('should require SUPABASE_SERVICE_ROLE_KEY', async () => {
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'test-id', contentHash: 'test-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })
  })

  describe('note not found handling', () => {
    it('should throw NonRetriableError when note does not exist', async () => {
      mockTargetNote = null

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: {
            data: { noteId: 'non-existent', contentHash: 'test-hash' },
          },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Note not found')
    })
  })

  describe('embedding status validation', () => {
    it('should throw NonRetriableError when embedding is not completed', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Test',
        problem: null,
        content: 'Content',
        embedding_content_hash: 'test-hash',
        embedding_status: 'pending',
      }

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'note-123', contentHash: 'test-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Note embedding not completed')
    })
  })

  describe('content hash mismatch handling', () => {
    it('should skip processing when content hash does not match', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Test',
        problem: null,
        content: 'Content',
        embedding_content_hash: 'different-hash',
        embedding_status: 'completed',
      }

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ skipped: boolean; reason: string }>

      const result = await handler({
        event: {
          data: { noteId: 'note-123', contentHash: 'original-hash' },
        },
        step: { run: mockStepRun },
      })

      expect(result.skipped).toBe(true)
      expect(result.reason).toContain('hash mismatch')
    })
  })

  describe('trashed note handling', () => {
    it('should skip trashed target notes', async () => {
      mockTargetNote = {
        id: 'note-trashed',
        user_id: 'user-456',
        title: 'Trashed note',
        problem: null,
        content: 'Content',
        embedding_content_hash: 'test-hash',
        embedding_status: 'completed',
        deleted_at: '2026-03-08T00:00:00Z',
      }

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ skipped: boolean; reason: string; judged: number }>

      const result = await handler({
        event: { data: { noteId: 'note-trashed', contentHash: 'test-hash' } },
        step: { run: mockStepRun },
      })

      expect(result.skipped).toBe(true)
      expect(result.reason).toContain('trashed')
      expect(result.judged).toBe(0)
      expect(mockJudgeNotePair).not.toHaveBeenCalled()
    })

    it('should remove a judgment if the pair is trashed during LLM processing', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockAfterJudgmentInsert = () => {
        mockCandidateDetails[0] = {
          ...mockCandidateDetails[0],
          deleted_at: '2026-03-08T00:00:00Z',
        }
      }
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Conflict found',
        result: 'tension',
        confidence: 0.9,
        explanation: 'Notes conflict',
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ judged: number; conflicts: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      expect(
        mockSupabaseCallLog.find((call) => call.method === 'conflict_judgments.delete')
      ).toBeDefined()
      expect(
        mockSupabaseCallLog.find((call) => call.method === 'conflicts.upsert')
      ).toBeUndefined()
      expect(result.judged).toBe(0)
      expect(result.conflicts).toBe(0)
    })

    it('should remove a conflict if the pair is trashed after conflict upsert', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockAfterConflictUpsert = () => {
        mockCandidateDetails[0] = {
          ...mockCandidateDetails[0],
          deleted_at: '2026-03-08T00:00:00Z',
        }
      }
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Conflict found',
        result: 'tension',
        confidence: 0.9,
        explanation: 'Notes conflict',
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ judged: number; conflicts: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      expect(
        mockSupabaseCallLog.find((call) => call.method === 'conflicts.delete')
      ).toBeDefined()
      expect(result.judged).toBe(1)
      expect(result.conflicts).toBe(0)
    })
  })

  describe('no candidates handling', () => {
    it('should return early when no candidates found', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Test',
        problem: null,
        content: 'Content',
        embedding_content_hash: 'test-hash',
        embedding_status: 'completed',
      }
      mockCandidates = []

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{
        success: boolean
        candidates: number
        judged: number
        conflicts: number
      }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'test-hash' } },
        step: { run: mockStepRun },
      })

      expect(result.success).toBe(true)
      expect(result.candidates).toBe(0)
      expect(result.judged).toBe(0)
      expect(result.conflicts).toBe(0)
    })
  })

  describe('already judged pairs filtering', () => {
    it('should skip pairs already judged with same content hash', async () => {
      const { computePairHash } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const targetHash = 'target-hash'
      const candidateHash = 'candidate-hash'
      const pairHash = computePairHash(
        targetHash,
        candidateHash,
        'note-123',
        'note-456'
      )

      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: targetHash,
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: candidateHash,
        },
      ]
      mockExistingJudgments = [{ pair_content_hash: pairHash }]

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{
        success: boolean
        candidates: number
        judged: number
        reason?: string
      }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: targetHash } },
        step: { run: mockStepRun },
      })

      expect(result.success).toBe(true)
      expect(result.candidates).toBe(1)
      expect(result.judged).toBe(0)
      expect(result.reason).toBe('All pairs already judged')
      expect(mockJudgeNotePair).not.toHaveBeenCalled()
    })
  })

  describe('LLM judgment processing', () => {
    it('should call judgeNotePair for unjudged pairs', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: 'Target problem',
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: 'Candidate problem',
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Test reasoning',
        result: 'no_conflict',
        confidence: 0.9,
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{
        success: boolean
        judged: number
        conflicts: number
      }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      expect(mockJudgeNotePair).toHaveBeenCalledTimes(1)
      expect(result.judged).toBe(1)
      expect(result.conflicts).toBe(0)
    })

    it('should store judgment in conflict_judgments table', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Detailed reasoning',
        result: 'no_conflict',
        confidence: 0.85,
        explanation: undefined,
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const insertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflict_judgments.insert'
      )
      expect(insertCall).toBeDefined()
      expect(insertCall?.args[0]).toMatchObject({
        user_id: 'user-456',
        judgment_result: 'no_conflict',
        confidence: 0.85,
        reasoning: 'Detailed reasoning',
        model: 'openai/gpt-4o-mini',
      })
    })

    it('should create conflict when result is tension with high confidence', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'These notes have tension',
        result: 'tension',
        confidence: 0.8,
        explanation: 'Note A claims X, Note B claims Y',
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ conflicts: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const upsertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflicts.upsert'
      )
      expect(upsertCall).toBeDefined()
      expect(upsertCall?.args[0]).toMatchObject({
        user_id: 'user-456',
        conflict_type: 'tension',
        explanation: 'Note A claims X, Note B claims Y',
        status: 'active',
      })
      expect(result.conflicts).toBe(1)
    })

    it('should create conflict when result is contradiction with high confidence', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'These notes contradict',
        result: 'contradiction',
        confidence: 0.95,
        explanation: 'Direct contradiction explanation',
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ conflicts: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const upsertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflicts.upsert'
      )
      expect(upsertCall).toBeDefined()
      expect(upsertCall?.args[0]).toMatchObject({
        conflict_type: 'contradiction',
      })
      expect(result.conflicts).toBe(1)
    })

    it('should NOT create conflict when confidence is below threshold', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Uncertain about this',
        result: 'tension',
        confidence: 0.6, // Below 0.7 threshold
        explanation: 'Low confidence tension',
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ conflicts: number; judged: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const upsertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflicts.upsert'
      )
      expect(upsertCall).toBeUndefined() // No conflict created
      expect(result.judged).toBe(1) // But judgment was recorded
      expect(result.conflicts).toBe(0)
    })

    it('should create conflict when confidence is exactly at threshold (0.7)', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Boundary case test',
        result: 'tension',
        confidence: 0.7, // Exactly at threshold - should create conflict
        explanation: 'Boundary threshold tension',
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ conflicts: number; judged: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      // Conflict should be created at exactly 0.7 (inclusive boundary)
      const upsertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflicts.upsert'
      )
      expect(upsertCall).toBeDefined()
      expect(upsertCall?.args[0]).toMatchObject({
        conflict_type: 'tension',
      })
      expect(result.judged).toBe(1)
      expect(result.conflicts).toBe(1)
    })

    it('should NOT create conflict for no_conflict result', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'No conflict found',
        result: 'no_conflict',
        confidence: 0.95, // High confidence but no_conflict
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ conflicts: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const upsertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflicts.upsert'
      )
      expect(upsertCall).toBeUndefined()
      expect(result.conflicts).toBe(0)
    })

    it('should use reasoning as explanation when explanation is not provided', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'This is the reasoning that should be used',
        result: 'tension',
        confidence: 0.8,
        // No explanation provided
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const upsertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflicts.upsert'
      )
      expect(upsertCall).toBeDefined()
      expect(upsertCall?.args[0]).toMatchObject({
        explanation: 'This is the reasoning that should be used',
      })
    })
  })

  describe('error handling', () => {
    it('should handle NoObjectGeneratedError gracefully', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []

      // Import NoObjectGeneratedError from our mock
      const { NoObjectGeneratedError } = await import('ai')
      mockJudgeNotePair.mockRejectedValueOnce(
        new NoObjectGeneratedError('Failed to generate')
      )

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ errors: number; judged: number }>

      // Should not throw - error is caught and counted
      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      expect(result.errors).toBe(1)
      expect(result.judged).toBe(0)
    })

    it('should handle unique constraint violation on judgment insert', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Test',
        result: 'no_conflict',
        confidence: 0.9,
      })
      mockInsertError = { code: '23505', message: 'Unique constraint violation' }

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ errors: number }>

      // Should not throw - unique constraint is handled gracefully
      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      // Unique constraint doesn't count as error, it's expected race condition
      expect(result.errors).toBe(0)
    })

    it('should re-throw non-NoObjectGeneratedError errors', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockRejectedValueOnce(new Error('API rate limit'))

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      // Should throw to trigger Inngest retry
      await expect(
        handler({
          event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('API rate limit')
    })
  })

  describe('canonical ordering', () => {
    it('should use canonical ordering for note IDs (smaller first)', async () => {
      // Target note has larger ID than candidate
      mockTargetNote = {
        id: 'zzz-larger-id',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'aaa-smaller-id', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'aaa-smaller-id',
          title: 'Candidate Note',
          problem: null,
          content: 'Candidate content',
          embedding_content_hash: 'candidate-hash',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair.mockResolvedValueOnce({
        reasoning: 'Test',
        result: 'tension',
        confidence: 0.8,
        explanation: 'Test explanation',
      })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await handler({
        event: { data: { noteId: 'zzz-larger-id', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const upsertCall = mockSupabaseCallLog.find(
        (c) => c.method === 'conflicts.upsert'
      )
      expect(upsertCall).toBeDefined()
      // Smaller ID should be note_a_id
      expect(upsertCall?.args[0]).toMatchObject({
        note_a_id: 'aaa-smaller-id',
        note_b_id: 'zzz-larger-id',
      })
    })
  })

  describe('RPC call parameters', () => {
    it('should call find_potential_conflicts with correct parameters', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = []

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      const rpcCall = mockSupabaseCallLog.find(
        (c) => c.method === 'rpc.find_potential_conflicts'
      )
      expect(rpcCall).toBeDefined()
      expect(rpcCall?.args[0]).toMatchObject({
        target_note_id: 'note-123',
        similarity_threshold: 0.65,
        match_count: 10,
      })
    })
  })

  describe('multiple candidates processing', () => {
    it('should process multiple candidates in sequence', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [
        { note_id: 'note-456', similarity: 0.9 },
        { note_id: 'note-789', similarity: 0.85 },
      ]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate 1',
          problem: null,
          content: 'Content 1',
          embedding_content_hash: 'hash-456',
        },
        {
          id: 'note-789',
          title: 'Candidate 2',
          problem: null,
          content: 'Content 2',
          embedding_content_hash: 'hash-789',
        },
      ]
      mockExistingJudgments = []
      mockJudgeNotePair
        .mockResolvedValueOnce({
          reasoning: 'First pair',
          result: 'no_conflict',
          confidence: 0.9,
        })
        .mockResolvedValueOnce({
          reasoning: 'Second pair',
          result: 'tension',
          confidence: 0.8,
          explanation: 'Tension found',
        })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ judged: number; conflicts: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      expect(mockJudgeNotePair).toHaveBeenCalledTimes(2)
      expect(result.judged).toBe(2)
      expect(result.conflicts).toBe(1) // Only second pair has conflict
    })

    it('should continue processing after NoObjectGeneratedError', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [
        { note_id: 'note-456', similarity: 0.9 },
        { note_id: 'note-789', similarity: 0.85 },
      ]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate 1',
          problem: null,
          content: 'Content 1',
          embedding_content_hash: 'hash-456',
        },
        {
          id: 'note-789',
          title: 'Candidate 2',
          problem: null,
          content: 'Content 2',
          embedding_content_hash: 'hash-789',
        },
      ]
      mockExistingJudgments = []

      const { NoObjectGeneratedError } = await import('ai')
      mockJudgeNotePair
        .mockRejectedValueOnce(new NoObjectGeneratedError('Failed'))
        .mockResolvedValueOnce({
          reasoning: 'Second pair succeeded',
          result: 'no_conflict',
          confidence: 0.9,
        })

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ judged: number; errors: number }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      expect(mockJudgeNotePair).toHaveBeenCalledTimes(2)
      expect(result.errors).toBe(1)
      expect(result.judged).toBe(1)
    })
  })

  describe('candidates without embedding hash', () => {
    it('should skip candidates without embedding_content_hash', async () => {
      mockTargetNote = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Target Note',
        problem: null,
        content: 'Target content',
        embedding_content_hash: 'target-hash',
        embedding_status: 'completed',
      }
      mockCandidates = [{ note_id: 'note-456', similarity: 0.9 }]
      mockCandidateDetails = [
        {
          id: 'note-456',
          title: 'Candidate without hash',
          problem: null,
          content: 'Content',
          embedding_content_hash: null, // No hash
        },
      ]
      mockExistingJudgments = []

      const { detectNoteConflicts } = await import(
        '@/lib/inngest/functions/detect-conflicts'
      )

      const handler = detectNoteConflicts.handler as (ctx: {
        event: { data: { noteId: string; contentHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ judged: number; reason?: string }>

      const result = await handler({
        event: { data: { noteId: 'note-123', contentHash: 'target-hash' } },
        step: { run: mockStepRun },
      })

      expect(mockJudgeNotePair).not.toHaveBeenCalled()
      expect(result.judged).toBe(0)
    })
  })
})

describe('computePairHash', () => {
  it('should produce consistent hash regardless of note order', async () => {
    const { computePairHash } = await import(
      '@/lib/inngest/functions/detect-conflicts'
    )

    const hash1 = computePairHash('hash-a', 'hash-b', 'id-aaa', 'id-zzz')
    const hash2 = computePairHash('hash-b', 'hash-a', 'id-zzz', 'id-aaa')

    expect(hash1).toBe(hash2)
  })

  it('should produce different hash when content hashes differ', async () => {
    const { computePairHash } = await import(
      '@/lib/inngest/functions/detect-conflicts'
    )

    const hash1 = computePairHash('hash-a', 'hash-b', 'id-1', 'id-2')
    const hash2 = computePairHash('hash-a', 'hash-c', 'id-1', 'id-2')

    expect(hash1).not.toBe(hash2)
  })

  it('should return a 64-character hex string (SHA-256)', async () => {
    const { computePairHash } = await import(
      '@/lib/inngest/functions/detect-conflicts'
    )

    const hash = computePairHash('hash-a', 'hash-b', 'id-1', 'id-2')

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should use smaller ID to determine hash order', async () => {
    const { computePairHash } = await import(
      '@/lib/inngest/functions/detect-conflicts'
    )
    const { createHash } = await import('crypto')

    // When id-1 < id-2, hash order should be (hash-a, hash-b)
    const hash1 = computePairHash('hash-a', 'hash-b', 'id-1', 'id-2')

    // Compute expected: id-1 < id-2, so firstHash = hash-a, secondHash = hash-b
    const expected = createHash('sha256').update('hash-a:hash-b').digest('hex')

    expect(hash1).toBe(expected)
  })
})
