import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  })),
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

  class MockInngest {
    createFunction(config: unknown, trigger: unknown, handler: unknown) {
      return { config, trigger, handler }
    }
  }

  return {
    EventSchemas: MockEventSchemas,
    Inngest: MockInngest,
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
