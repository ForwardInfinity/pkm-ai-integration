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

describe('reconstructProblem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  describe('validation', () => {
    it('should return empty suggestion when both content and title are empty', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      const result = await reconstructProblem('', '', false)

      expect(result).toEqual({ suggestion: '' })
      expect(mockGenerateObject).not.toHaveBeenCalled()
    })

    it('should return empty suggestion when content and title are whitespace only', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      const result = await reconstructProblem('   ', '   ', false)

      expect(result).toEqual({ suggestion: '' })
      expect(mockGenerateObject).not.toHaveBeenCalled()
    })

    it('should throw error when OPENROUTER_API_KEY is not set', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'OPENROUTER_API_KEY environment variable is not set'
      )
    })

    it('should throw error when input exceeds maximum length', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      const longContent = 'a'.repeat(33000)

      await expect(reconstructProblem(longContent, 'title', false)).rejects.toThrow(
        /Note is too long.*Maximum allowed: 32,000 characters/
      )
    })
  })

  describe('single problem statement', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should return suggestion on valid response', async () => {
      const mockResult = {
        suggestion: 'What are the trade-offs between local-first and cloud-first architectures?',
      }
      mockGenerateObject.mockResolvedValueOnce({ object: mockResult })

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      const result = await reconstructProblem('Content about local-first architecture...', 'Local-First Design', false)

      expect(result).toEqual({ suggestion: mockResult.suggestion })
    })

    it('should call generateObject with singleProblemSchema when generateAlternatives is false', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { suggestion: 'A problem statement' },
      })

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await reconstructProblem('Some content', 'Some title', false)

      expect(mockGenerateObject).toHaveBeenCalledTimes(1)
      const callArgs = mockGenerateObject.mock.calls[0][0]
      expect(callArgs.schema).toBeDefined()
      expect(callArgs.temperature).toBe(0.5)
      expect(callArgs.maxRetries).toBe(3)
    })
  })

  describe('alternatives generation', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should return alternatives on valid response', async () => {
      const mockResult = {
        alternatives: [
          'How can we ensure data consistency in offline-first applications?',
          'What patterns enable seamless sync between local and remote data stores?',
        ],
      }
      mockGenerateObject.mockResolvedValueOnce({ object: mockResult })

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      const result = await reconstructProblem('Content about sync...', 'Data Sync Patterns', true)

      expect(result).toEqual({
        suggestion: '',
        alternatives: mockResult.alternatives,
      })
    })

    it('should call generateObject with alternativesSchema when generateAlternatives is true', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { alternatives: ['Alt 1', 'Alt 2'] },
      })

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await reconstructProblem('Some content', 'Some title', true)

      expect(mockGenerateObject).toHaveBeenCalledTimes(1)
      const callArgs = mockGenerateObject.mock.calls[0][0]
      expect(callArgs.schema).toBeDefined()
      expect(callArgs.temperature).toBe(0.7)
      expect(callArgs.maxRetries).toBe(3)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should throw rate limit error on 429 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Rate limited', statusCode: 429 })
      )

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'Rate limit exceeded. Please try again in a moment.'
      )
    })

    it('should throw quota error on 402 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Insufficient credits', statusCode: 402 })
      )

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'AI service quota exceeded. Please try again later.'
      )
    })

    it('should throw service unavailable error on 502 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Bad gateway', statusCode: 502 })
      )

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'AI service temporarily unavailable. Please try again.'
      )
    })

    it('should throw service unavailable error on 503 status', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Service unavailable', statusCode: 503 })
      )

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'AI service temporarily unavailable. Please try again.'
      )
    })

    it('should throw generic API error for other status codes', async () => {
      const { APICallError } = await import('ai')
      mockGenerateObject.mockRejectedValueOnce(
        new APICallError({ message: 'Internal server error', statusCode: 500 })
      )

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'AI service error: Internal server error'
      )
    })

    it('should throw unexpected error for non-Error rejections', async () => {
      mockGenerateObject.mockRejectedValueOnce('string error')

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'An unexpected error occurred while reconstructing the problem.'
      )
    })

    it('should re-throw regular Error instances', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('Custom error message'))

      const { reconstructProblem } = await import('@/features/ai/actions/reconstruct-problem')

      await expect(reconstructProblem('content', 'title', false)).rejects.toThrow(
        'Custom error message'
      )
    })
  })
})
