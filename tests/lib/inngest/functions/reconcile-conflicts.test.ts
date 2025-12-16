import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStepRun = vi.fn((name: string, fn: () => Promise<unknown>) => fn())

let mockQueryLog: Array<{ method: string; args: unknown[] }> = []

let mockCandidateNotes: Array<{ id: string; embedding_content_hash: string | null }> =
  []
let mockJudgmentNoteAIds: string[] = []
let mockJudgmentNoteBIds: string[] = []

const createReconcileConflictsMockSupabaseClient = () => {
  const notesChain: Record<string, unknown> = {}

  const chainMethod = (method: string) =>
    vi.fn((...args: unknown[]) => {
      mockQueryLog.push({ method, args })
      return notesChain
    })

  notesChain.select = chainMethod('notes.select')
  notesChain.eq = chainMethod('notes.eq')
  notesChain.not = chainMethod('notes.not')
  notesChain.is = chainMethod('notes.is')
  notesChain.order = chainMethod('notes.order')
  notesChain.limit = vi.fn((...args: unknown[]) => {
    mockQueryLog.push({ method: 'notes.limit', args })
    return Promise.resolve({ data: mockCandidateNotes, error: null })
  })

  return {
    from: vi.fn((table: string) => {
      if (table === 'notes') {
        return notesChain
      }

      if (table === 'conflict_judgments') {
        return {
          select: vi.fn((...args: unknown[]) => {
            mockQueryLog.push({ method: 'conflict_judgments.select', args })
            return {
              in: vi.fn((field: string, values: string[]) => {
                mockQueryLog.push({
                  method: 'conflict_judgments.in',
                  args: [field, values],
                })

                if (field === 'note_a_id') {
                  return Promise.resolve({
                    data: mockJudgmentNoteAIds.map((id) => ({ note_a_id: id })),
                    error: null,
                  })
                }

                if (field === 'note_b_id') {
                  return Promise.resolve({
                    data: mockJudgmentNoteBIds.map((id) => ({ note_b_id: id })),
                    error: null,
                  })
                }

                return Promise.resolve({ data: [], error: null })
              }),
            }
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

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
    mockJudgmentNoteAIds = []
    mockJudgmentNoteBIds = []
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
      mockCandidateNotes = []

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

    it('should not emit events if all candidate notes already have judgments', async () => {
      mockCandidateNotes = [
        { id: 'note-1', embedding_content_hash: 'hash-1' },
        { id: 'note-2', embedding_content_hash: 'hash-2' },
      ]
      mockJudgmentNoteAIds = ['note-1']
      mockJudgmentNoteBIds = ['note-2']

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: [] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{ reconciled: number; candidates: number; message: string }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.candidates).toBe(2)
      expect(result.reconciled).toBe(0)
      expect(result.message).toContain('already have conflict judgments')
      expect(mockStepSendEvent).not.toHaveBeenCalled()
    })

    it('should emit conflict detection events for notes with no judgments', async () => {
      mockCandidateNotes = [
        { id: 'note-1', embedding_content_hash: 'hash-1' },
        { id: 'note-2', embedding_content_hash: 'hash-2' },
        { id: 'note-3', embedding_content_hash: 'hash-3' },
      ]
      mockJudgmentNoteAIds = ['note-1']
      mockJudgmentNoteBIds = []

      const { reconcileConflicts } = await import(
        '@/lib/inngest/functions/reconcile-conflicts'
      )

      const mockStepSendEvent = vi.fn(async () => ({ ids: ['evt-1', 'evt-2'] }))

      const handler = reconcileConflicts.handler as (ctx: {
        step: { run: typeof mockStepRun; sendEvent: typeof mockStepSendEvent }
      }) => Promise<{ reconciled: number; candidates: number; skippedAlreadyJudged: number }>

      const result = await handler({
        step: { run: mockStepRun, sendEvent: mockStepSendEvent },
      })

      expect(result.candidates).toBe(3)
      expect(result.skippedAlreadyJudged).toBe(1)
      expect(result.reconciled).toBe(2)

      expect(mockStepSendEvent).toHaveBeenCalledTimes(1)
      const call = mockStepSendEvent.mock.calls[0]
      expect(call[0]).toBe('emit-conflict-detection-events')

      const payload = call[1] as Array<{
        name: string
        data: { noteId: string; contentHash: string }
      }>

      expect(payload).toHaveLength(2)
      expect(payload.map((e) => e.name)).toEqual([
        'note/conflicts.detection.requested',
        'note/conflicts.detection.requested',
      ])
      expect(payload.map((e) => e.data.noteId)).toEqual(['note-2', 'note-3'])
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
