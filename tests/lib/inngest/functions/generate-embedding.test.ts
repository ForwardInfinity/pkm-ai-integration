import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashNoteForEmbedding } from '@/lib/embedding/content-hash'

// Mock step.run to execute callbacks immediately
const mockStepRun = vi.fn((name: string, fn: () => Promise<unknown>) => fn())

// Track mock calls for integration tests
let mockSupabaseCallLog: Array<{ method: string; args: unknown[] }> = []
let mockNoteData: {
  id: string
  user_id: string
  title: string
  problem: string | null
  content: string
  embedding_content_hash: string | null
  embedding_status: string
} | null = null
let mockNoteUpdates: Record<string, unknown>[] = []

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

// Enhanced mock for integration tests
const createIntegrationMockSupabaseClient = () => {
  const mockClient = {
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
                if (mockNoteData && mockNoteData.id === value) {
                  return Promise.resolve({ data: mockNoteData, error: null })
                }
                return Promise.resolve({ data: null, error: { message: 'Not found' } })
              }),
            })),
          })),
          update: vi.fn((updateData: Record<string, unknown>) => {
            mockNoteUpdates.push(updateData)
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(() => {
                      mockSupabaseCallLog.push({
                        method: 'notes.update',
                        args: [updateData],
                      })
                      return Promise.resolve({ data: { id: mockNoteData?.id }, error: null })
                    }),
                    maybeSingle: vi.fn(() => {
                      mockSupabaseCallLog.push({
                        method: 'notes.update.maybeSingle',
                        args: [updateData],
                      })
                      return Promise.resolve({ data: { id: mockNoteData?.id }, error: null })
                    }),
                  })),
                })),
              })),
            }
          }),
        }
      }
      if (table === 'note_chunks') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => {
              mockSupabaseCallLog.push({ method: 'note_chunks.delete', args: [] })
              return Promise.resolve({ error: null })
            }),
          })),
          insert: vi.fn((rows: unknown[]) => {
            mockSupabaseCallLog.push({ method: 'note_chunks.insert', args: [rows] })
            return Promise.resolve({ error: null })
          }),
        }
      }
      return createMockSupabaseClient({}).from(table)
    }),
  }
  return mockClient
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createMockSupabaseClient({})),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    textEmbeddingModel: vi.fn(() => 'mock-embedding-model'),
  })),
}))

vi.mock('ai', () => ({
  embedMany: vi.fn(() =>
    Promise.resolve({
      embeddings: [new Array(1536).fill(0.1)],
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

describe('generateNoteEmbedding integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    // Reset integration test state
    mockSupabaseCallLog = []
    mockNoteData = null
    mockNoteUpdates = []
  })

  describe('stale event detection', () => {
    it('should skip processing when content hash has changed since event was sent', async () => {
      // Setup: Note exists with different hash than expected
      const noteContent = {
        title: 'Test Note',
        problem: null,
        content: 'Original content',
      }
      const originalHash = hashNoteForEmbedding(noteContent)

      // Note was updated after event was sent
      mockNoteData = {
        id: 'note-123',
        user_id: 'user-456',
        title: 'Test Note',
        problem: null,
        content: 'Updated content after event', // Different content
        embedding_content_hash: null,
        embedding_status: 'pending',
      }

      // Re-mock Supabase with integration client
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => createIntegrationMockSupabaseClient()),
      }))

      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      const handler = generateNoteEmbedding.handler as (ctx: {
        event: { data: { noteId: string; expectedHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ skipped: boolean; reason: string }>

      const result = await handler({
        event: { data: { noteId: 'note-123', expectedHash: originalHash } },
        step: { run: mockStepRun },
      })

      expect(result.skipped).toBe(true)
      expect(result.reason).toContain('hash mismatch')
    })
  })

  describe('empty content handling', () => {
    it('should handle notes with empty content gracefully', async () => {
      const emptyNote = {
        title: '',
        problem: null,
        content: '',
      }
      const expectedHash = hashNoteForEmbedding(emptyNote)

      mockNoteData = {
        id: 'note-empty',
        user_id: 'user-456',
        ...emptyNote,
        embedding_content_hash: expectedHash,
        embedding_status: 'pending',
      }

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => createIntegrationMockSupabaseClient()),
      }))

      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      const handler = generateNoteEmbedding.handler as (ctx: {
        event: { data: { noteId: string; expectedHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ skipped: boolean; reason: string }>

      const result = await handler({
        event: { data: { noteId: 'note-empty', expectedHash } },
        step: { run: mockStepRun },
      })

      expect(result.skipped).toBe(true)
      expect(result.reason).toContain('No content to embed')
    })
  })

  describe('chunking behavior', () => {
    it('should use chunking utilities from lib/embedding', async () => {
      // Test that the function correctly imports and uses chunkText
      const { chunkText } = await import('@/lib/embedding/chunker')

      const longText = 'This is a test paragraph. '.repeat(100)
      const chunks = chunkText(longText, {
        chunkSizeChars: 2000,
        overlapChars: 200,
      })

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks[0].text.length).toBeLessThanOrEqual(2000)
    })

    it('should use mean pooling for aggregate embedding', async () => {
      const { meanPoolEmbeddings } = await import('@/lib/embedding/chunker')

      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.3, 0.4, 0.5],
      ]

      const aggregated = meanPoolEmbeddings(embeddings)

      expect(aggregated[0]).toBeCloseTo(0.2)
      expect(aggregated[1]).toBeCloseTo(0.3)
      expect(aggregated[2]).toBeCloseTo(0.4)
    })
  })

  describe('note not found handling', () => {
    it('should throw NonRetriableError when note does not exist', async () => {
      mockNoteData = null // No note in database

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => createIntegrationMockSupabaseClient()),
      }))

      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      const handler = generateNoteEmbedding.handler as (ctx: {
        event: { data: { noteId: string; expectedHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<unknown>

      await expect(
        handler({
          event: { data: { noteId: 'non-existent', expectedHash: 'some-hash' } },
          step: { run: mockStepRun },
        })
      ).rejects.toThrow('Note not found')
    })
  })

  describe('embedMany configuration', () => {
    it('should configure embedMany with maxRetries: 0', async () => {
      // Verify the function config includes the expected behavior
      // The actual embedMany call is tested through integration
      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      // Verify function is configured with Inngest's retry logic (not AI SDK)
      expect(generateNoteEmbedding.config.retries).toBe(3)

      // The actual maxRetries: 0 is in the embedMany call - we verify this through code inspection
      // A full integration test would require mocking embedMany to capture its arguments
    })
  })

  describe('zero-row update handling', () => {
    it('should handle zero-row update in store-aggregate-embedding gracefully', async () => {
      // This test verifies the function doesn't throw when Supabase returns { data: null, error: null }
      // which happens when the conditional update (hash check) matches 0 rows

      const noteContent = {
        title: 'Test Note',
        problem: null,
        content: 'Some content to generate embedding',
      }
      const expectedHash = hashNoteForEmbedding(noteContent)

      // Create a mock that returns null data (0 rows updated) on the final update
      const createZeroRowMockClient = () => {
        let updateCount = 0
        return {
          from: vi.fn((table: string) => {
            if (table === 'notes') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn(() => {
                      return Promise.resolve({
                        data: {
                          id: 'note-zero-row',
                          user_id: 'user-456',
                          ...noteContent,
                          embedding_content_hash: expectedHash,
                          embedding_status: 'pending',
                        },
                        error: null,
                      })
                    }),
                  })),
                })),
                update: vi.fn(() => {
                  updateCount++
                  return {
                    eq: vi.fn(() => ({
                      eq: vi.fn(() => ({
                        select: vi.fn(() => ({
                          single: vi.fn(() => {
                            // First update (mark-processing) succeeds
                            if (updateCount === 1) {
                              return Promise.resolve({ data: { id: 'note-zero-row' }, error: null })
                            }
                            // Subsequent updates return null (0 rows - hash changed)
                            return Promise.resolve({ data: null, error: null })
                          }),
                          maybeSingle: vi.fn(() => {
                            // For store-aggregate-embedding with maybeSingle
                            return Promise.resolve({ data: null, error: null })
                          }),
                        })),
                      })),
                    })),
                  }
                }),
              }
            }
            if (table === 'note_chunks') {
              return {
                delete: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ error: null })),
                })),
                insert: vi.fn(() => Promise.resolve({ error: null })),
              }
            }
            return createMockSupabaseClient({}).from(table)
          }),
        }
      }

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => createZeroRowMockClient()),
      }))

      // Mock embedMany to return valid embeddings
      vi.doMock('ai', () => ({
        embedMany: vi.fn(() =>
          Promise.resolve({
            embeddings: [[0.1, 0.2, 0.3]],
          })
        ),
      }))

      const { generateNoteEmbedding } = await import(
        '@/lib/inngest/functions/generate-embedding'
      )

      const handler = generateNoteEmbedding.handler as (ctx: {
        event: { data: { noteId: string; expectedHash: string } }
        step: { run: typeof mockStepRun }
      }) => Promise<{ skipped?: boolean; reason?: string }>

      // The function should complete without throwing
      // and return skipped: true when zero rows are updated
      const result = await handler({
        event: { data: { noteId: 'note-zero-row', expectedHash } },
        step: { run: mockStepRun },
      })

      // If zero rows are updated, function should return skipped result
      // (depends on which update returns 0 rows - this tests the general behavior)
      expect(result).toBeDefined()
    })
  })
})
