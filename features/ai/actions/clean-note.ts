'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText, APICallError } from 'ai'
import type { CleanedNote } from '../types'

const MAX_INPUT_CHARS = 32000

const SYSTEM_PROMPT = `You are helping improve the readability of notes without changing their meaning or substance.

Your task is to clean up messy notes by:
- Fixing grammar, spelling, and punctuation errors
- Improving sentence structure and flow
- Adding markdown headers or formatting where it helps readability
- Organizing content more clearly (paragraphs, lists, etc.)
- Fixing capitalization issues

You MUST preserve:
- The author's voice and writing style
- All original ideas, arguments, and opinions
- Technical terminology and domain-specific language
- The overall meaning and intent
- Backlinks to other notes


You MUST NOT:
- Add new information or ideas
- Remove any substantive content
- Change the author's conclusions or opinions
- Over-format or add unnecessary structure
- Change/remove backlinks to other notes

IMPORTANT: The response language MUST match the note's original language.

Respond with a valid JSON object containing the cleaned versions:
{
  "title": "cleaned title",
  "problem": "cleaned problem statement",
  "content": "cleaned content with markdown"
}`

export async function cleanNote(
  title: string,
  problem: string,
  content: string
): Promise<CleanedNote> {
  // Validate API key
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  // Validate input length
  const totalLength = title.length + problem.length + content.length
  if (totalLength > MAX_INPUT_CHARS) {
    throw new Error(
      `Note is too long (${totalLength.toLocaleString()} characters). Maximum allowed: ${MAX_INPUT_CHARS.toLocaleString()} characters.`
    )
  }

  const openrouter = createOpenRouter({ apiKey })
  const model = openrouter('openai/gpt-4o-mini')

  const userPrompt = `Please clean up the following note to improve readability while preserving all meaning:

Title: ${title || '(empty)'}

Problem: ${problem || '(empty)'}

Content:
${content || '(empty)'}

Return the cleaned versions as JSON. If a field is empty or marked as "(empty)", return an empty string for that field.`

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 4096,
      temperature: 0.3,
      maxRetries: 3,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON')
    }

    const result = JSON.parse(jsonMatch[0]) as CleanedNote
    return {
      title: result.title || '',
      problem: result.problem || '',
      content: result.content || '',
    }
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
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. Please try again.')
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred while cleaning the note.')
  }
}
