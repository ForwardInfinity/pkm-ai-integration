'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { THESIS_ANALYSIS_PROMPT } from '../prompts'
import type { ThesisAnalysis } from '../types'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export async function analyzeNote(
  title: string,
  problem: string | null,
  content: string
): Promise<ThesisAnalysis> {
  if (!content.trim() && !title.trim()) {
    throw new Error('Note must have content or title to analyze')
  }

  const model = openrouter('openai/gpt-4o-mini')

  const noteContext = `Title: ${title}
${problem ? `Problem: ${problem}` : ''}
Content: ${content}`

  const { text } = await generateText({
    model,
    system: THESIS_ANALYSIS_PROMPT,
    prompt: noteContext,
  })

  try {
    const parsed = JSON.parse(text)
    return {
      thesis: parsed.thesis || '',
      assumptions: parsed.assumptions || [],
      keyInferences: parsed.keyInferences || [],
    }
  } catch {
    // Fallback: use the entire response as thesis
    return {
      thesis: text.trim(),
      assumptions: [],
      keyInferences: [],
    }
  }
}
