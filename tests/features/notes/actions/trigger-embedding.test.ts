import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashNoteForEmbedding } from '@/lib/embedding/content-hash'

// Mock inngest client
const mockSend = vi.fn()
vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: mockSend,
  },
}))

// Mock Supabase client
const mockUpdate = vi.fn()

const createMockSupabaseClient = (options: {
  selectResult?: { data: unknown; error: unknown }
  updateResult?: { error: unknown }
}) => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve(options.selectResult ?? { data: null, error: null })
        ),
      })),
    })),
    update: vi.fn((updateData: Record<string, unknown>) => {
      mockUpdate(updateData)
      return {
        eq: vi.fn(() =>
          Promise.resolve(options.updateResult ?? { error: null })
        ),
      }
    }),
  })),
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createMockSupabaseClient({}))),
}))

describe('triggerEmbeddingGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('event deduplication', () => {
    it('should send event with deduplication id', async () => {
      const noteId = 'test-note-123'
      const note = {
        id: noteId,
        title: 'Test Title',
        problem: 'Test Problem',
        content: 'Test Content',
      }
      const expectedHash = hashNoteForEmbedding(note)

      // Mock Supabase to return no existing note with matching hash
      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() =>
          Promise.resolve(
            createMockSupabaseClient({
              selectResult: {
                data: { embedding_status: 'pending', embedding_content_hash: null },
                error: null,
              },
              updateResult: { error: null },
            })
          )
        ),
      }))

      const { triggerEmbeddingGeneration } = await import(
        '@/features/notes/actions/trigger-embedding'
      )

      await triggerEmbeddingGeneration(note)

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `note-embedding:${noteId}:${expectedHash}`,
          name: 'note/embedding.requested',
          data: {
            noteId,
            expectedHash,
          },
        })
      )
    })
  })

  describe('fail fast on DB error', () => {
    it('should not send event if DB update fails', async () => {
      const noteId = 'test-note-456'
      const note = {
        id: noteId,
        title: 'Test Title',
        problem: null,
        content: 'Test Content',
      }

      // Mock Supabase to return error on update
      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() =>
          Promise.resolve(
            createMockSupabaseClient({
              selectResult: {
                data: { embedding_status: 'pending', embedding_content_hash: null },
                error: null,
              },
              updateResult: { error: { message: 'Database connection failed' } },
            })
          )
        ),
      }))

      const { triggerEmbeddingGeneration } = await import(
        '@/features/notes/actions/trigger-embedding'
      )

      const result = await triggerEmbeddingGeneration(note)

      // Should return failure
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to update note status')
      expect(result.error).toContain('Database connection failed')

      // Should NOT send event
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should return success: true when update succeeds', async () => {
      const note = {
        id: 'test-note-789',
        title: 'Test Title',
        problem: null,
        content: 'Test Content',
      }

      // Mock Supabase with successful responses
      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() =>
          Promise.resolve(
            createMockSupabaseClient({
              selectResult: {
                data: { embedding_status: 'pending', embedding_content_hash: null },
                error: null,
              },
              updateResult: { error: null },
            })
          )
        ),
      }))

      const { triggerEmbeddingGeneration } = await import(
        '@/features/notes/actions/trigger-embedding'
      )

      const result = await triggerEmbeddingGeneration(note)

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })
  })

  describe('skip already completed', () => {
    it('should skip if embedding already up-to-date', async () => {
      const note = {
        id: 'test-note-completed',
        title: 'Test Title',
        problem: null,
        content: 'Test Content',
      }
      const expectedHash = hashNoteForEmbedding(note)

      // Mock Supabase to return note with matching hash and completed status
      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() =>
          Promise.resolve(
            createMockSupabaseClient({
              selectResult: {
                data: {
                  embedding_status: 'completed',
                  embedding_content_hash: expectedHash,
                },
                error: null,
              },
            })
          )
        ),
      }))

      const { triggerEmbeddingGeneration } = await import(
        '@/features/notes/actions/trigger-embedding'
      )

      const result = await triggerEmbeddingGeneration(note)

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(true)
      expect(result.reason).toContain('up-to-date')
      expect(mockSend).not.toHaveBeenCalled()
    })
  })
})
