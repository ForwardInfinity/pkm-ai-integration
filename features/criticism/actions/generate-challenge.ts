'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'
import { createStreamableValue } from '@ai-sdk/rsc'
import { CHALLENGE_SYSTEM_PROMPTS } from '../prompts'
import type { ChallengeAngle, Exchange } from '../types'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

function buildContextMessages(
  thesis: string,
  noteContent: string,
  previousExchanges: Exchange[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  // Initial context
  messages.push({
    role: 'user',
    content: `I'm defending this thesis:\n\n"${thesis}"\n\nFrom this note:\n${noteContent}`,
  })

  // Add previous exchanges for context
  for (const exchange of previousExchanges) {
    messages.push({
      role: 'assistant',
      content: `[${exchange.challenge.angle.toUpperCase()}] ${exchange.challenge.content}`,
    })
    if (exchange.defense) {
      messages.push({
        role: 'user',
        content: exchange.defense.content,
      })
    }
    if (exchange.evaluation) {
      messages.push({
        role: 'assistant',
        content: `[Evaluation: ${exchange.evaluation.quality}] ${exchange.evaluation.feedback}`,
      })
    }
  }

  return messages
}

export async function generateChallenge(
  thesis: string,
  noteContent: string,
  angle: ChallengeAngle,
  previousExchanges: Exchange[]
) {
  const stream = createStreamableValue('')

  const model = openrouter('openai/gpt-4o')
  const systemPrompt = CHALLENGE_SYSTEM_PROMPTS[angle]
  const messages = buildContextMessages(thesis, noteContent, previousExchanges)

  // Add instruction for this specific challenge
  messages.push({
    role: 'user',
    content: `Now challenge my thesis from the angle of: ${angle.replace('_', ' ').toUpperCase()}. Generate a pointed, specific challenge.`,
  })

  ;(async () => {
    try {
      const { textStream } = streamText({
        model,
        system: systemPrompt,
        messages,
      })

      for await (const delta of textStream) {
        stream.update(delta)
      }
    } catch (error) {
      console.error('Challenge generation error:', error)
      stream.update('Unable to generate challenge. Please try again.')
    } finally {
      stream.done()
    }
  })()

  return { challenge: stream.value }
}
