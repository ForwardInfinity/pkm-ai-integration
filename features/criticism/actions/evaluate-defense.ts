'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { DEFENSE_EVALUATION_PROMPT } from '../prompts'
import type { DefenseEvaluation, Challenge } from '../types'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export async function evaluateDefense(
  challenge: Challenge,
  defense: string,
  thesis: string
): Promise<DefenseEvaluation> {
  const model = openrouter('openai/gpt-4o-mini')

  const context = `THESIS: "${thesis}"

CHALLENGE (${challenge.angle.replace('_', ' ')}):
${challenge.content}

DEFENSE:
${defense}

Evaluate this defense.`

  const { text } = await generateText({
    model,
    system: DEFENSE_EVALUATION_PROMPT,
    prompt: context,
  })

  try {
    const parsed = JSON.parse(text)
    return {
      quality: parsed.quality || 'weak',
      feedback: parsed.feedback || 'Unable to evaluate defense.',
      shouldEscalate: parsed.shouldEscalate ?? false,
      escalationPrompt: parsed.escalationPrompt,
    }
  } catch {
    // Fallback evaluation
    return {
      quality: 'partial',
      feedback: text.trim() || 'Defense received.',
      shouldEscalate: false,
    }
  }
}
