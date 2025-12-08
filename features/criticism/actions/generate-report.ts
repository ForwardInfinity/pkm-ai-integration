'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { REPORT_GENERATION_PROMPT } from '../prompts'
import type { CrucibleSession, CrucibleReport } from '../types'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export async function generateReport(
  session: CrucibleSession
): Promise<CrucibleReport> {
  const model = openrouter('openai/gpt-4o-mini')

  // Build context from exchanges
  const exchangeSummaries = session.exchanges.map((exchange, i) => {
    const defenseText = exchange.defense?.content || '[No defense provided]'
    const evalText = exchange.evaluation
      ? `[${exchange.evaluation.quality}] ${exchange.evaluation.feedback}`
      : '[Not evaluated]'
    const concededText = exchange.conceded ? ' (CONCEDED)' : ''

    return `Round ${i + 1} - ${exchange.challenge.angle.replace('_', ' ').toUpperCase()}${concededText}:
Challenge: ${exchange.challenge.content}
Defense: ${defenseText}
Evaluation: ${evalText}`
  }).join('\n\n')

  const context = `THESIS: "${session.thesis.thesis}"

EXCHANGES:
${exchangeSummaries}

CONCESSIONS: ${session.concessions.length > 0 ? session.concessions.join('; ') : 'None'}

Generate a constructive summary report.`

  const { text } = await generateText({
    model,
    system: REPORT_GENERATION_PROMPT,
    prompt: context,
  })

  // Build survived challenges list
  const survivedChallenges = session.exchanges
    .filter((e) => !e.conceded && e.defense && e.evaluation?.quality !== 'weak')
    .map((e) => ({
      angle: e.challenge.angle,
      challenge: e.challenge.content,
      defense: e.defense?.content || '',
      evaluation: e.evaluation?.feedback || '',
    }))

  let suggestedRevisions: string[] = []
  try {
    const parsed = JSON.parse(text)
    suggestedRevisions = parsed.suggestedRevisions || []
  } catch {
    // Extract suggestions from plain text if JSON parsing fails
    suggestedRevisions = [text.trim()]
  }

  const duration = session.completedAt
    ? session.completedAt - session.startedAt
    : Date.now() - session.startedAt

  return {
    sessionId: session.id,
    noteId: session.noteId,
    thesis: session.thesis.thesis,
    survivedChallenges,
    concessions: session.concessions,
    suggestedRevisions,
    duration,
    completedRounds: session.exchanges.length,
  }
}
