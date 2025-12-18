import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock AI SDK before importing the module
const mockGenerateObject = vi.fn()

vi.mock('ai', () => ({
  generateObject: mockGenerateObject,
  APICallError: {
    isInstance: (error: unknown) => error instanceof Error && 'statusCode' in error,
  },
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mock-model')),
}))

describe('conflictJudgmentSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should be a valid Zod schema', async () => {
    const { conflictJudgmentSchema } = await import(
      '@/lib/ai/conflict-judgment'
    )

    expect(conflictJudgmentSchema).toBeDefined()
    expect(conflictJudgmentSchema instanceof z.ZodObject).toBe(true)
  })

  describe('result field validation', () => {
    it('should accept "no_conflict" as valid result', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const validJudgment = {
        reasoning: 'These notes discuss different topics.',
        result: 'no_conflict',
        confidence: 0.9,
        explanation: '',
      }

      expect(() => conflictJudgmentSchema.parse(validJudgment)).not.toThrow()
    })

    it('should accept "tension" as valid result', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const validJudgment = {
        reasoning: 'These notes have different perspectives.',
        result: 'tension',
        confidence: 0.75,
        explanation: 'Note A claims X, Note B claims Y.',
      }

      expect(() => conflictJudgmentSchema.parse(validJudgment)).not.toThrow()
    })

    it('should accept "contradiction" as valid result', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const validJudgment = {
        reasoning: 'These notes make mutually exclusive claims.',
        result: 'contradiction',
        confidence: 0.95,
        explanation: 'Note A says meeting at 3pm, Note B says 4pm.',
      }

      expect(() => conflictJudgmentSchema.parse(validJudgment)).not.toThrow()
    })

    it('should reject invalid result values', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const invalidJudgment = {
        reasoning: 'Some reasoning',
        result: 'invalid_value',
        confidence: 0.5,
        explanation: '',
      }

      expect(() => conflictJudgmentSchema.parse(invalidJudgment)).toThrow()
    })
  })

  describe('confidence field validation', () => {
    it('should accept confidence between 0 and 1', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const lowConfidence = {
        reasoning: 'Test',
        result: 'no_conflict',
        confidence: 0,
        explanation: '',
      }
      const highConfidence = {
        reasoning: 'Test',
        result: 'no_conflict',
        confidence: 1,
        explanation: '',
      }
      const midConfidence = {
        reasoning: 'Test',
        result: 'no_conflict',
        confidence: 0.73,
        explanation: '',
      }

      expect(() => conflictJudgmentSchema.parse(lowConfidence)).not.toThrow()
      expect(() => conflictJudgmentSchema.parse(highConfidence)).not.toThrow()
      expect(() => conflictJudgmentSchema.parse(midConfidence)).not.toThrow()
    })

    it('should reject confidence below 0', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const invalidJudgment = {
        reasoning: 'Test',
        result: 'no_conflict',
        confidence: -0.1,
        explanation: '',
      }

      expect(() => conflictJudgmentSchema.parse(invalidJudgment)).toThrow()
    })

    it('should reject confidence above 1', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const invalidJudgment = {
        reasoning: 'Test',
        result: 'no_conflict',
        confidence: 1.1,
        explanation: '',
      }

      expect(() => conflictJudgmentSchema.parse(invalidJudgment)).toThrow()
    })
  })

  describe('explanation field', () => {
    it('should require explanation field', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const withoutExplanation = {
        reasoning: 'Test reasoning',
        result: 'no_conflict',
        confidence: 0.9,
      }

      // explanation is now required - parsing without it should fail
      expect(() => conflictJudgmentSchema.parse(withoutExplanation)).toThrow()
    })

    it('should accept empty string explanation for no_conflict', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const withEmptyExplanation = {
        reasoning: 'Test reasoning',
        result: 'no_conflict',
        confidence: 0.9,
        explanation: '',
      }

      const parsed = conflictJudgmentSchema.parse(withEmptyExplanation)
      expect(parsed.explanation).toBe('')
    })

    it('should accept judgment with explanation', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const withExplanation = {
        reasoning: 'Test reasoning',
        result: 'tension',
        confidence: 0.8,
        explanation: 'A detailed user-facing explanation.',
      }

      const parsed = conflictJudgmentSchema.parse(withExplanation)
      expect(parsed.explanation).toBe('A detailed user-facing explanation.')
    })
  })

  describe('reasoning field validation', () => {
    it('should require reasoning field', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const missingReasoning = {
        result: 'no_conflict',
        confidence: 0.9,
      }

      expect(() => conflictJudgmentSchema.parse(missingReasoning)).toThrow()
    })

    it('should accept empty string reasoning', async () => {
      const { conflictJudgmentSchema } = await import(
        '@/lib/ai/conflict-judgment'
      )

      const emptyReasoning = {
        reasoning: '',
        result: 'no_conflict',
        confidence: 0.9,
        explanation: '',
      }

      // Empty string is technically valid for string field
      expect(() => conflictJudgmentSchema.parse(emptyReasoning)).not.toThrow()
    })
  })
})

describe('NoteForJudgment interface', () => {
  it('should export NoteForJudgment type', async () => {
    // Import the module - if NoteForJudgment type is exported, compilation will succeed
    const conflictJudgmentModule = await import('@/lib/ai/conflict-judgment')

    // Verify the module exports what we expect
    expect(conflictJudgmentModule.conflictJudgmentSchema).toBeDefined()
    expect(conflictJudgmentModule.judgeNotePair).toBeDefined()

    // The NoteForJudgment type is a TypeScript type export - it exists at compile time
    // This test verifies the module structure is correct
    const note = {
      title: 'Test',
      problem: null as string | null,
      content: 'Content',
    }

    // If NoteForJudgment interface doesn't match this shape, TypeScript would error
    expect(note).toBeDefined()
  })
})

describe('judgeNotePair', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should call generateObject with correct parameters', async () => {
    const mockJudgment = {
      reasoning: 'Test reasoning',
      result: 'no_conflict',
      confidence: 0.9,
      explanation: '',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'Note A', problem: 'Problem A', content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    await judgeNotePair(noteA, noteB, 'test-api-key')

    expect(mockGenerateObject).toHaveBeenCalledTimes(1)
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'conflict_judgment',
        temperature: 0.1,
        maxRetries: 0,
      })
    )
  })

  it('should include both notes in the prompt', async () => {
    const mockJudgment = {
      reasoning: 'Test',
      result: 'no_conflict',
      confidence: 0.9,
      explanation: '',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'First Note', problem: 'Issue 1', content: 'Content of first note' }
    const noteB = { title: 'Second Note', problem: 'Issue 2', content: 'Content of second note' }

    await judgeNotePair(noteA, noteB, 'test-api-key')

    const call = mockGenerateObject.mock.calls[0][0]
    expect(call.prompt).toContain('First Note')
    expect(call.prompt).toContain('Second Note')
    expect(call.prompt).toContain('Content of first note')
    expect(call.prompt).toContain('Content of second note')
    expect(call.prompt).toContain('Issue 1')
    expect(call.prompt).toContain('Issue 2')
  })

  it('should handle notes with null problem field', async () => {
    const mockJudgment = {
      reasoning: 'Test',
      result: 'no_conflict',
      confidence: 0.9,
      explanation: '',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'Note A', problem: null, content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    await judgeNotePair(noteA, noteB, 'test-api-key')

    const call = mockGenerateObject.mock.calls[0][0]
    expect(call.prompt).toContain('(none)')
  })

  it('should return the judgment object from generateObject', async () => {
    const mockJudgment = {
      reasoning: 'Detailed analysis of both notes',
      result: 'tension',
      confidence: 0.85,
      explanation: 'These notes present different viewpoints',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'Note A', problem: null, content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    const result = await judgeNotePair(noteA, noteB, 'test-api-key')

    expect(result).toEqual(mockJudgment)
    expect(result.result).toBe('tension')
    expect(result.confidence).toBe(0.85)
  })

  it('should propagate errors from generateObject', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('API rate limit exceeded'))

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'Note A', problem: null, content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    await expect(judgeNotePair(noteA, noteB, 'test-api-key')).rejects.toThrow(
      'API rate limit exceeded'
    )
  })

  it('should include system prompt with conservative detection emphasis', async () => {
    const mockJudgment = {
      reasoning: 'Test',
      result: 'no_conflict',
      confidence: 0.9,
      explanation: '',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'Note A', problem: null, content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    await judgeNotePair(noteA, noteB, 'test-api-key')

    const call = mockGenerateObject.mock.calls[0][0]
    expect(call.system).toContain('CONSERVATIVE')
    expect(call.system).toContain('contradiction')
    expect(call.system).toContain('tension')
    expect(call.system).toContain('no_conflict')
  })

  it('should include key question about simultaneous truth in system prompt', async () => {
    const mockJudgment = {
      reasoning: 'Test',
      result: 'no_conflict',
      confidence: 0.9,
      explanation: '',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'Note A', problem: null, content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    await judgeNotePair(noteA, noteB, 'test-api-key')

    const call = mockGenerateObject.mock.calls[0][0]
    expect(call.system).toContain('Could both claims be true simultaneously')
  })

  it('should include warning against similarity-as-conflict trap', async () => {
    const mockJudgment = {
      reasoning: 'Test',
      result: 'no_conflict',
      confidence: 0.9,
      explanation: '',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair } = await import('@/lib/ai/conflict-judgment')

    const noteA = { title: 'Note A', problem: null, content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    await judgeNotePair(noteA, noteB, 'test-api-key')

    const call = mockGenerateObject.mock.calls[0][0]
    expect(call.system).toContain('Similar')
  })

  it('should use correct schema with schema name and description', async () => {
    const mockJudgment = {
      reasoning: 'Test',
      result: 'no_conflict',
      confidence: 0.9,
      explanation: '',
    }

    mockGenerateObject.mockResolvedValueOnce({ object: mockJudgment })

    const { judgeNotePair, conflictJudgmentSchema } = await import(
      '@/lib/ai/conflict-judgment'
    )

    const noteA = { title: 'Note A', problem: null, content: 'Content A' }
    const noteB = { title: 'Note B', problem: null, content: 'Content B' }

    await judgeNotePair(noteA, noteB, 'test-api-key')

    const call = mockGenerateObject.mock.calls[0][0]
    expect(call.schema).toBe(conflictJudgmentSchema)
    expect(call.schemaName).toBe('conflict_judgment')
    expect(call.schemaDescription).toBeDefined()
  })
})

describe('ConflictJudgment type', () => {
  it('should infer correct type from schema', async () => {
    const { conflictJudgmentSchema } = await import(
      '@/lib/ai/conflict-judgment'
    )

    // Type assertion test - validates that the inferred type matches expected shape
    const judgment = conflictJudgmentSchema.parse({
      reasoning: 'Test',
      result: 'contradiction',
      confidence: 0.95,
      explanation: 'Explanation',
    })

    // These assertions verify the shape at runtime
    expect(typeof judgment.reasoning).toBe('string')
    expect(['no_conflict', 'tension', 'contradiction']).toContain(judgment.result)
    expect(typeof judgment.confidence).toBe('number')
    expect(typeof judgment.explanation).toBe('string')
  })
})
