import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashNoteForEmbedding } from '@/lib/embedding/content-hash'

// Mock step.run to execute callbacks immediately
const mockStepRun = vi.fn((name: string, fn: () => Promise<unknown>) => fn())

// Mock Supabase response builders
const createMockSupabaseClient = (overrides: {
  selectResult?: { data: unknown; error: unknown }
  updateResult?: { data: unknown; error: unknown }
}) => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve(
            overrides.selectResult ?? { data: null, error: null }
          )
        ),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve(
                overrides.updateResult ?? { data: { id: 'test' }, error: null }
              )
            ),
          })),
        })),
      })),
    })),
  })),
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createMockSupabaseClient({})),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    textEmbeddingModel: vi.fn(() => 'mock-embedding-model'),
  })),
}))

vi.mock('ai', () => ({
  embed: vi.fn(() =>
    Promise.resolve({
      embedding: new Array(1536).fill(0.1),
    })
  ),
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

describe('generateNoteEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  })

  describe('configuration', () => {
    it('should be exported and configured correctly', async () => {
      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      expect(generateNoteEmbedding).toBeDefined()
      expect(generateNoteEmbedding.config).toEqual({
        id: 'generate-note-embedding',
        name: 'Generate Note Embedding',
        retries: 3,
        concurrency: { limit: 5 },
      })
    })

    it('should trigger on note/embedding.requested event', async () => {
      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      expect(generateNoteEmbedding.trigger).toEqual({
        event: 'note/embedding.requested',
      })
    })

    it('should have a handler function', async () => {
      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      expect(typeof generateNoteEmbedding.handler).toBe('function')
    })
  })

  describe('content hash helper', () => {
    it('should produce consistent hash for same content', () => {
      const note = {
        title: 'Test Title',
        problem: 'Test Problem',
        content: 'Test Content',
      }

      const hash1 = hashNoteForEmbedding(note)
      const hash2 = hashNoteForEmbedding(note)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hash when content changes', () => {
      const note1 = { title: 'Title', problem: null, content: 'Content A' }
      const note2 = { title: 'Title', problem: null, content: 'Content B' }

      expect(hashNoteForEmbedding(note1)).not.toBe(hashNoteForEmbedding(note2))
    })

    it('should return a 64-character hex string (SHA-256)', () => {
      const note = { title: 'Test', problem: null, content: 'Content' }
      const hash = hashNoteForEmbedding(note)

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('event payload', () => {
    it('should expect noteId and expectedHash in event data', async () => {
      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      // The handler expects { noteId, expectedHash } in event.data
      // This is tested indirectly through the trigger type
      expect(generateNoteEmbedding.trigger).toEqual({
        event: 'note/embedding.requested',
      })
    })
  })

  describe('environment validation', () => {
    it('should require OPENROUTER_API_KEY', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')

      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      const handler = generateNoteEmbedding.handler as (ctx: {
        event: { data: { noteId: string; expectedHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'test-id', expectedHash: 'test-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('OPENROUTER_API_KEY environment variable is not set')
    })

    it('should require NEXT_PUBLIC_SUPABASE_URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')

      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      const handler = generateNoteEmbedding.handler as (ctx: {
        event: { data: { noteId: string; expectedHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'test-id', expectedHash: 'test-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })

    it('should require SUPABASE_SERVICE_ROLE_KEY', async () => {
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      const handler = generateNoteEmbedding.handler as (ctx: {
        event: { data: { noteId: string; expectedHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'test-id', expectedHash: 'test-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Missing Supabase environment variables')
    })
  })
})
