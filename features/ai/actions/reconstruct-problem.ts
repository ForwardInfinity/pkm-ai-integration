'use server'

import { z } from 'zod'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject, APICallError } from 'ai'
import type { ProblemReconstructionResult } from '../types'

const MAX_INPUT_CHARS = 32000

const singleProblemSchema = z.object({
  suggestion: z
    .string()
    .min(10, 'Problem statement must be at least 10 characters')
    .max(500, 'Problem statement must be at most 500 characters')
    .describe(
      'A concise problem statement (1-2 sentences) that captures the core question, challenge, or tension the note is exploring'
    ),
})

const alternativesSchema = z.object({
  alternatives: z
    .array(
      z
        .string()
        .min(10, 'Each problem statement must be at least 10 characters')
        .max(500, 'Each problem statement must be at most 500 characters')
    )
    .length(2)
    .describe(
      'Two different problem statement framings, each capturing a different angle or perspective'
    ),
})

const SYSTEM_PROMPT = `You are helping a knowledge worker articulate the problem their note addresses. 
Your task is to infer and generate a concise problem statement (1-2 sentences) that captures the core question, challenge, or tension the note content is exploring.

Guidelines:
- Focus on epistemic value - what question is being investigated?
- Frame it as a problem to solve, question to answer, or tension to resolve
- Be specific to the content, not generic
- Keep it concise but meaningful
- Do NOT include numbering, bullet points, or prefixes

IMPORTANT: The response language MUST match the user's language.`

export async function reconstructProblem(
  content: string,
  title: string,
  generateAlternatives = false
): Promise<ProblemReconstructionResult> {
  if (!content.trim() && !title.trim()) {
    return { suggestion: '' }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const totalLength = title.length + content.length
  if (totalLength > MAX_INPUT_CHARS) {
    throw new Error(
      `Note is too long (${totalLength.toLocaleString()} characters). Maximum allowed: ${MAX_INPUT_CHARS.toLocaleString()} characters.`
    )
  }

  const openrouter = createOpenRouter({ apiKey })
  const model = openrouter('openai/gpt-4o-mini')

  const userPrompt = generateAlternatives
    ? `Title: ${title || '(untitled)'}

Content: ${content || '(empty)'}

Generate 2 different problem statement framings for this note. Each should capture a different angle or perspective on what problem/question this note addresses.`
    : `Title: ${title || '(untitled)'}

Content: ${content || '(empty)'}

Generate a single problem statement for this note that captures what problem, question, or challenge the content is addressing.`

  try {
    if (generateAlternatives) {
      const { object } = await generateObject({
        model,
        schema: alternativesSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
        maxRetries: 3,
      })

      return {
        suggestion: '',
        alternatives: object.alternatives,
      }
    }

    const { object } = await generateObject({
      model,
      schema: singleProblemSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.5,
      maxRetries: 3,
    })

    return { suggestion: object.suggestion }
  } catch (error) {
    if (error instanceof APICallError) {
      const statusCode = error.statusCode
      if (statusCode === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      }
      if (statusCode === 402) {
        throw new Error('AI service quota exceeded. Please try again later.')
      }
      if (statusCode === 503 || statusCode === 502) {
        throw new Error('AI service temporarily unavailable. Please try again.')
      }
      throw new Error(`AI service error: ${error.message}`)
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred while reconstructing the problem.')
  }
}
