'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import type { ProblemReconstructionResult } from '../types'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

const SYSTEM_PROMPT = `You are helping a knowledge worker articulate the problem their note addresses. 
Your task is to infer and generate a concise problem statement (1-2 sentences) that captures the core question, challenge, or tension the note content is exploring.

Guidelines:
- Focus on epistemic value - what question is being investigated?
- Frame it as a problem to solve, question to answer, or tension to resolve
- Be specific to the content, not generic
- Keep it concise but meaningful`

export async function reconstructProblem(
  content: string,
  title: string,
  generateAlternatives = false
): Promise<ProblemReconstructionResult> {
  if (!content.trim() && !title.trim()) {
    return { suggestion: '' }
  }

  const model = openrouter('openai/gpt-4o-mini')

  const userPrompt = generateAlternatives
    ? `Title: ${title}

Content: ${content}

Generate 3 different problem statement framings for this note. Each should capture a different angle or perspective on what problem/question this note addresses.

Respond with exactly 3 problem statements, one per line, without numbering or bullet points.`
    : `Title: ${title}

Content: ${content}

Generate a single problem statement for this note that captures what problem, question, or challenge the content is addressing.`

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  })

  if (generateAlternatives) {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    return {
      suggestion: lines[0] || '',
      alternatives: lines.slice(1),
    }
  }

  return { suggestion: text.trim() }
}
