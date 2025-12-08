'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import type { CleanedNote } from '../types'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

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

You MUST NOT:
- Add new information or ideas
- Remove any substantive content
- Change the author's conclusions or opinions
- Over-format or add unnecessary structure

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
  const model = openrouter('openai/gpt-4o-mini')

  const userPrompt = `Please clean up the following note to improve readability while preserving all meaning:

Title: ${title || '(empty)'}

Problem: ${problem || '(empty)'}

Content:
${content || '(empty)'}

Return the cleaned versions as JSON. If a field is empty or marked as "(empty)", return an empty string for that field.`

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  })

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    const result = JSON.parse(jsonMatch[0]) as CleanedNote
    return {
      title: result.title || '',
      problem: result.problem || '',
      content: result.content || '',
    }
  } catch {
    throw new Error('Failed to parse AI response')
  }
}
