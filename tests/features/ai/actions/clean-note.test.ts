import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateText = vi.fn()

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mock-model')),
}))

vi.mock('ai', () => {
  class MockAPICallError extends Error {
    statusCode: number
    constructor({ message, statusCode }: { message: string; statusCode: number }) {
      super(message)
      this.name = 'APICallError'
      this.statusCode = statusCode
    }
  }

  return {
    generateText: mockGenerateText,
    APICallError: MockAPICallError,
  }
})

describe('cleanNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  describe('validation', () => {
    it('should throw error when OPENROUTER_API_KEY is not set', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'OPENROUTER_API_KEY environment variable is not set'
      )
    })

    it('should throw error when input exceeds maximum length', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      const longContent = 'a'.repeat(33000)

      await expect(cleanNote('title', 'problem', longContent)).rejects.toThrow(
        /Note is too long.*Maximum allowed: 32,000 characters/
      )
    })
  })

  describe('successful cleaning', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should return cleaned note on valid response', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          title: 'Cleaned Title',
          problem: 'Cleaned problem',
          content: 'Cleaned content',
        }),
      })

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      const result = await cleanNote('messy title', 'messy problem', 'messy content')

      expect(result).toEqual({
        title: 'Cleaned Title',
        problem: 'Cleaned problem',
        content: 'Cleaned content',
      })
    })

    it('should handle JSON with surrounding text', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Here is the cleaned version:\n{"title": "Clean", "problem": "", "content": "Content"}\nDone!',
      })

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      const result = await cleanNote('title', '', 'content')

      expect(result).toEqual({
        title: 'Clean',
        problem: '',
        content: 'Content',
      })
    })

    it('should return empty strings for null/undefined fields', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({
          title: null,
          problem: undefined,
          content: '',
        }),
      })

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      const result = await cleanNote('', '', '')

      expect(result).toEqual({
        title: '',
        problem: '',
        content: '',
      })
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should throw rate limit error on 429 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateText.mockRejectedValueOnce(
        new APICallError({ message: 'Rate limited', statusCode: 429 })
      )

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'Rate limit exceeded. Please try again in a moment.'
      )
    })

    it('should throw quota error on 402 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateText.mockRejectedValueOnce(
        new APICallError({ message: 'Insufficient credits', statusCode: 402 })
      )

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'AI service quota exceeded. Please try again later.'
      )
    })

    it('should throw service unavailable error on 502 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateText.mockRejectedValueOnce(
        new APICallError({ message: 'Bad gateway', statusCode: 502 })
      )

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'AI service temporarily unavailable. Please try again.'
      )
    })

    it('should throw service unavailable error on 503 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateText.mockRejectedValueOnce(
        new APICallError({ message: 'Service unavailable', statusCode: 503 })
      )

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'AI service temporarily unavailable. Please try again.'
      )
    })

    it('should throw generic API error for other status codes', async () => {
      const { APICallError } = await import('ai')
      mockGenerateText.mockRejectedValueOnce(
        new APICallError({ message: 'Internal server error', statusCode: 500 })
      )

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'AI service error: Internal server error'
      )
    })

    it('should throw parse error when response has no JSON', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'This is not JSON at all',
      })

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'AI response did not contain valid JSON'
      )
    })

    it('should throw parse error on invalid JSON', async () => {
      // JSON that matches regex but is syntactically invalid
      mockGenerateText.mockResolvedValueOnce({
        text: '{"title": undefined}',
      })

      const { cleanNote } = await import('@/features/ai/actions/clean-note')

      await expect(cleanNote('title', 'problem', 'content')).rejects.toThrow(
        'Failed to parse AI response. Please try again.'
      )
    })
  })
})
