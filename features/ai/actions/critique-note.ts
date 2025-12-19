'use server'

import { z } from 'zod'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject, APICallError } from 'ai'
import type { CritiqueResult } from '../types'

const MAX_INPUT_CHARS = 32000

const critiqueSchema = z.object({
  counterarguments: z
    .array(z.string())
    .describe('The strongest arguments against the main claims in this note'),
  weakLinks: z
    .array(z.string())
    .describe('Logical gaps or weak connections between premises and conclusions'),
  hiddenAssumptions: z
    .array(z.string())
    .describe('Unstated beliefs or premises the argument depends on'),
  blindspots: z
    .array(z.string())
    .describe('Evidence, perspectives, or edge cases not considered'),
})

const SYSTEM_PROMPT = `You are an epistemological critic in the tradition of Karl Popper and David Deutsch. Your role is to help strengthen ideas by rigorously examining them for weaknesses.

Your approach:
1. First, steel-man the argument - understand it at its strongest
2. Then, identify genuine weaknesses that would help the author improve their thinking
3. Be constructive but rigorous - real criticism, not flattery

For each category:
- **Counterarguments**: What are the strongest arguments AGAINST the main claims? Think of what a thoughtful skeptic would say.
- **Weak Links**: Where does the reasoning have gaps? Are there logical jumps, non-sequiturs, or conclusions that don't follow from the premises?
- **Hidden Assumptions**: What unstated beliefs must be true for the argument to work? What is the author taking for granted?
- **Blindspots**: What evidence, perspectives, or edge cases has the author not considered? What might they be missing?

Rules:
- Only include genuine, substantive criticisms
- If a category has no valid criticisms, return an empty array - don't force-fill
- Be specific and actionable, not vague
- Match the language of the note (if the note is in Spanish, critique in Spanish)
- Each item should be 1-2 sentences, clear and direct`

export async function critiqueNote(
  title: string,
  problem: string,
  content: string
): Promise<CritiqueResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const totalLength = title.length + problem.length + content.length
  if (totalLength > MAX_INPUT_CHARS) {
    throw new Error(
      `Note is too long (${totalLength.toLocaleString()} characters). Maximum allowed: ${MAX_INPUT_CHARS.toLocaleString()} characters.`
    )
  }

  if (totalLength < 50) {
    throw new Error('Note is too short to critique meaningfully. Add more content first.')
  }

  const openrouter = createOpenRouter({ apiKey })
  const model = openrouter('openai/gpt-4o-mini')

  const userPrompt = `Please critique the following note:

Title: ${title || '(untitled)'}

Problem being addressed: ${problem || '(none specified)'}

Content:
${content || '(empty)'}

Provide your critique in the structured format.`

  try {
    const { object } = await generateObject({
      model,
      schema: critiqueSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.4,
      maxRetries: 3,
    })

    return object
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
    throw new Error('An unexpected error occurred while critiquing the note.')
  }
}
