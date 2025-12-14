import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashNoteForEmbedding } from '@/lib/embedding/content-hash'

// Mock step.run to execute callbacks immediately
const mockStepRun = vi.fn((name: string, fn: () => Promise<unknown>) => fn())

// Track mock queries for verification
let mockQueryLog: Array<{ query: string; args: unknown[] }> = []

// Configurable mock data for different test scenarios
let mockStaleWithTimestamp: Array<{
  id: string
  title: string
  problem: string | null
  content: string
}> = []
let mockNullTimestampNotes: typeof mockStaleWithTimestamp = []

// Mock inngest client
const mockInngestSend = vi.fn(() => Promise.resolve())

// Create a chainable mock that tracks queries
const createChainableMock = (
  resolveValue: { data: unknown; error: unknown } = { data: [], error: null }
) => {
  const chain: Record<string, unknown> = {}

  const createMethod = (name: string) =>
    vi.fn((...args: unknown[]) => {
      mockQueryLog.push({ query: name, args })
      return chain
    })

  chain.select = createMethod('select')
  chain.in = createMethod('in')
  chain.lt = createMethod('lt')
  chain.is = createMethod('is')
  chain.eq = createMethod('eq')
  chain.not = createMethod('not')
  chain.limit = vi.fn((...args: unknown[]) => {
    mockQueryLog.push({ query: 'limit', args })
    return Promise.resolve(resolveValue)
  })
  chain.update = createMethod('update')

  return chain
}

// Create mock Supabase client for reconcile-embeddings tests
const createReconcileMockSupabaseClient = () => {
  let queryCount = 0

  return {
    from: vi.fn((table: string) => {
      if (table === 'notes') {
        queryCount++
        const currentQuery = queryCount

        // Return appropriate mock data based on query sequence
        // Query 1a: stale with timestamp, Query 1b: null timestamp, Query 2: legacy, Query 3: missing chunks
        const chain = createChainableMock()

        // Override limit to return different data based on query
        chain.limit = vi.fn((...args: unknown[]) => {
          mockQueryLog.push({ query: `notes.limit (query ${currentQuery})`, args })

          if (currentQuery === 1) {
            // Query 1a: stale with timestamp
            return Promise.resolve({ data: mockStaleWithTimestamp, error: null })
          } else if (currentQuery === 2) {
            // Query 1b: null timestamp
            return Promise.resolve({ data: mockNullTimestampNotes, error: null })
          }
          // Query 2 and 3: legacy and missing chunks - return empty
          return Promise.resolve({ data: [], error: null })
        })

        return chain
      }

      if (table === 'note_chunks') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => {
              mockQueryLog.push({ query: 'note_chunks.select.in', args: [] })
              return Promise.resolve({ data: [], error: null })
            }),
          })),
        }
      }

      return createChainableMock()
    }),
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createReconcileMockSupabaseClient()),
}))

vi.mock('inngest', () => {
  class MockEventSchemas {
    fromRecord() {
      return {}
    }
  }

  class MockInngest {
    createFunction(config: unknown, trigger: unknown, handler: unknown) {
      return { config, trigger, handler }
    }
    send = mockInngestSend
  }

  return {
    EventSchemas: MockEventSchemas,
    Inngest: MockInngest,
  }
})

describe('reconcileEmbeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    // Reset test state
    mockQueryLog = []
    mockStaleWithTimestamp = []
    mockNullTimestampNotes = []
  })

  describe('configuration', () => {
    it('should be exported and configured correctly', async () => {
      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      expect(reconcileEmbeddings).toBeDefined()
      expect(reconcileEmbeddings.config).toEqual({
        id: 'reconcile-embeddings',
        name: 'Reconcile Stale Embeddings',
      })
    })

    it('should trigger on cron schedule every 5 minutes', async () => {
      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      expect(reconcileEmbeddings.trigger).toEqual({
        cron: '*/5 * * * *',
      })
    })

    it('should NOT have explicit retries config (uses Inngest defaults)', async () => {
      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      // Verify no retries property is set - Inngest provides default retries
      expect(reconcileEmbeddings.config).not.toHaveProperty('retries')
    })
  })

  describe('stale note selection', () => {
    it('should include processing status in stale notes query', async () => {
      mockStaleWithTimestamp = [
        { id: 'note-processing', title: 'Processing Note', problem: null, content: 'Stuck' },
      ]

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<{ reconciled: number }>

      await handler({
        step: { run: mockStepRun },
      })

      // Verify Query 1a includes 'processing' status
      const inQuery = mockQueryLog.find((q) => q.query === 'in')
      expect(inQuery).toBeDefined()
      expect(inQuery?.args[1]).toContain('processing')
      expect(inQuery?.args[1]).toContain('pending')
      expect(inQuery?.args[1]).toContain('failed')
    })

    it('should include pending notes with NULL embedding_requested_at', async () => {
      mockNullTimestampNotes = [
        { id: 'note-null-pending', title: 'Null Timestamp', problem: null, content: 'Content' },
      ]

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<{ reconciled: number }>

      await handler({
        step: { run: mockStepRun },
      })

      // Verify Query 1b is executed (second 'in' query)
      const inQueries = mockQueryLog.filter((q) => q.query === 'in')
      // Should have at least 2 'in' queries - one for Query 1a, one for Query 1b
      expect(inQueries.length).toBeGreaterThanOrEqual(2)

      // Query 1b should only include pending/failed, not processing
      const query1b = inQueries[1]
      expect(query1b?.args[1]).toContain('pending')
      expect(query1b?.args[1]).toContain('failed')
      expect(query1b?.args[1]).not.toContain('processing')
    })

    it('should include failed notes with NULL embedding_requested_at', async () => {
      mockNullTimestampNotes = [
        { id: 'note-null-failed', title: 'Failed Note', problem: null, content: 'Failed content' },
      ]

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<{ reconciled: number }>

      await handler({
        step: { run: mockStepRun },
      })

      // Query 1b should include 'failed' status
      const inQueries = mockQueryLog.filter((q) => q.query === 'in')
      const query1b = inQueries[1]
      expect(query1b?.args[1]).toContain('failed')
    })

    it('should merge results from both queries without duplicates', async () => {
      // Same note appears in both queries (edge case - shouldn't happen but handle gracefully)
      mockStaleWithTimestamp = [
        { id: 'note-1', title: 'Note 1', problem: null, content: 'Content 1' },
        { id: 'note-2', title: 'Note 2', problem: null, content: 'Content 2' },
      ]
      mockNullTimestampNotes = [
        { id: 'note-1', title: 'Note 1', problem: null, content: 'Content 1' }, // Duplicate
        { id: 'note-3', title: 'Note 3', problem: null, content: 'Content 3' },
      ]

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<{ reconciled: number }>

      const result = await handler({
        step: { run: mockStepRun },
      })

      // Should reconcile 3 unique notes, not 4 (note-1 is deduplicated)
      expect(result.reconciled).toBe(3)
    })

    it('should return early when no notes need reconciliation', async () => {
      // All mock arrays empty by default

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<{ reconciled: number; message: string }>

      const result = await handler({
        step: { run: mockStepRun },
      })

      expect(result.reconciled).toBe(0)
      expect(result.message).toBe('No notes need reconciliation')
    })
  })

  describe('content hash computation', () => {
    it('should compute correct hash for reconciled notes', async () => {
      const noteContent = {
        title: 'Test Title',
        problem: 'Test Problem',
        content: 'Test Content',
      }
      mockStaleWithTimestamp = [{ id: 'note-hash-test', ...noteContent }]

      const expectedHash = hashNoteForEmbedding(noteContent)

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<{ reconciled: number }>

      await handler({
        step: { run: mockStepRun },
      })

      // Verify inngest.send was called with correct hash
      expect(mockInngestSend).toHaveBeenCalled()
      const sentEvents = mockInngestSend.mock.calls[0][0] as Array<{
        name: string
        data: { noteId: string; expectedHash: string }
      }>
      expect(sentEvents[0].data.expectedHash).toBe(expectedHash)
    })
  })

  describe('environment validation', () => {
    it('should require NEXT_PUBLIC_SUPABASE_URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })

    it('should require SUPABASE_SERVICE_ROLE_KEY', async () => {
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

      const { reconcileEmbeddings } = await import(
        '@/lib/inngest/functions/reconcile-embeddings'
      )

      const handler = reconcileEmbeddings.handler as (ctx: {
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })
  })
})
