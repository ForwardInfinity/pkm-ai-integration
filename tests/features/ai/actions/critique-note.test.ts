import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateObject = vi.fn()

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
    generateObject: mockGenerateObject,
    APICallError: MockAPICallError,
  }
})

describe('critiqueNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  describe('validation', () => {
    it('should throw error when OPENROUTER_API_KEY is not set', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('title', 'problem', 'content')).rejects.toThrow(
        'OPENROUTER_API_KEY environment variable is not set'
      )
    })

    it('should throw error when input exceeds maximum length', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      const longContent = 'a'.repeat(33000)

      await expect(critiqueNote('title', 'problem', longContent)).rejects.toThrow(
        /Note is too long.*Maximum allowed: 32,000 characters/
      )
    })

    it('should throw error when input is too short', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('Hi', '', '')).rejects.toThrow(
        'Note is too short to critique meaningfully. Add more content first.'
      )
    })
  })

  describe('successful critique', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should return critique result on valid response', async () => {
      const mockResult = {
        counterarguments: ['Counter 1', 'Counter 2'],
        weakLinks: ['Weak link 1'],
        hiddenAssumptions: ['Assumption 1'],
        blindspots: ['Blindspot 1'],
      }
      mockGenerateObject.mockResolvedValueOnce({ object: mockResult })

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      const result = await critiqueNote('title', 'problem statement', 'This is my note content with enough text.')

      expect(result).toEqual(mockResult)
    })

    it('should return empty arrays when no critiques found', async () => {
      const mockResult = {
        counterarguments: [],
        weakLinks: [],
        hiddenAssumptions: [],
        blindspots: [],
      }
      mockGenerateObject.mockResolvedValueOnce({ object: mockResult })

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      const result = await critiqueNote('title', 'problem', 'A solid well-reasoned note content here.')

      expect(result).toEqual(mockResult)
    })
  })

  describe('error handling', () => {
    const validContent = 'This is a note with enough content to pass the minimum length validation check for the critique feature.'

    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should throw rate limit error on 429 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Rate limited', statusCode: 429 })
      )

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('title', 'problem', validContent)).rejects.toThrow(
        'Rate limit exceeded. Please try again in a moment.'
      )
    })

    it('should throw quota error on 402 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Insufficient credits', statusCode: 402 })
      )

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('title', 'problem', validContent)).rejects.toThrow(
        'AI service quota exceeded. Please try again later.'
      )
    })

    it('should throw service unavailable error on 502 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Bad gateway', statusCode: 502 })
      )

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('title', 'problem', validContent)).rejects.toThrow(
        'AI service temporarily unavailable. Please try again.'
      )
    })

    it('should throw service unavailable error on 503 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Service unavailable', statusCode: 503 })
      )

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('title', 'problem', validContent)).rejects.toThrow(
        'AI service temporarily unavailable. Please try again.'
      )
    })

    it('should throw generic API error for other status codes', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Internal server error', statusCode: 500 })
      )

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('title', 'problem', validContent)).rejects.toThrow(
        'AI service error: Internal server error'
      )
    })

    it('should throw unexpected error for non-Error rejections', async () => {
      mockGenerateObject.mockRejectedValueOnce('string error')

      const { critiqueNote } = await import('@/features/ai/actions/critique-note')

      await expect(critiqueNote('title', 'problem', validContent)).rejects.toThrow(
        'An unexpected error occurred while critiquing the note.'
      )
    })
  })
})
