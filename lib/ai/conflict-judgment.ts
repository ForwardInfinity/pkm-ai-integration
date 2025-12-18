import { z } from 'zod'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject, APICallError } from 'ai'

/**
 * Zod schema for structured LLM conflict judgment output.
 * Used with generateObject for type-safe structured responses.
 */
export const conflictJudgmentSchema = z.object({
  reasoning: z
    .string()
    .describe(
      'Step-by-step analysis: What does Note A claim? What does Note B claim? Could both be true simultaneously? Consider scope, context, and time differences.'
    ),
  result: z
    .enum(['no_conflict', 'tension', 'contradiction'])
    .describe(
      'no_conflict = claims are compatible or unrelated. tension = claims create friction but could both be true in different contexts. contradiction = claims cannot both be true simultaneously.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'How confident are you in this judgment? 0.0 = very uncertain, 1.0 = absolutely certain. Be conservative - borderline cases should have lower confidence.'
    ),
  explanation: z
    .string()
    .describe(
      'User-facing explanation of the conflict. For tension/contradiction: "Note A claims [X]. Note B claims [Y]. These [contradict/create tension] because [reason]." For no_conflict: return empty string "".'
    ),
})

export type ConflictJudgment = z.infer<typeof conflictJudgmentSchema>

/**
 * System prompt for conflict detection.
 * Emphasizes conservative detection and clear definitions.
 */
const SYSTEM_PROMPT = `You are analyzing two notes for logical conflicts. Your task is to determine if the claims in these notes are compatible.

## Definitions

- **contradiction**: The claims CANNOT both be true simultaneously. They directly negate each other.
  Example: "The meeting is at 3pm" vs "The meeting is at 4pm"

- **tension**: The claims create friction but COULD both be true in different contexts, times, or scopes.
  Example: "Remote work increases productivity" vs "In-person collaboration is essential for innovation"

- **no_conflict**: The claims are compatible, unrelated, or complementary. This includes:
  - Claims about different topics
  - Claims that don't interact logically
  - Claims that are similar or supportive of each other
  - Claims where one is more specific than the other

## Critical Guidelines

1. **Key Question**: "Could both claims be true simultaneously?"
   - If yes (even in different contexts) → no_conflict or tension
   - If absolutely not → contradiction

2. **Be CONSERVATIVE**: When in doubt, choose no_conflict
   - Similar ideas are NOT conflicts
   - Different aspects of the same topic are NOT conflicts
   - Complementary perspectives are NOT conflicts

3. **Avoid False Positives**:
   - High semantic similarity does NOT mean conflict
   - Notes on the same topic often agree, not conflict
   - Only flag genuine logical incompatibilities

4. **Confidence Calibration**:
   - 0.9-1.0: Absolutely certain, explicit contradiction
   - 0.7-0.9: High confidence, clear logical tension
   - 0.5-0.7: Moderate confidence, possible tension
   - Below 0.5: Too uncertain, should probably be no_conflict

5. **Explanation Quality**: If you detect a conflict, provide a clear, specific explanation that helps the user understand exactly what claims conflict and why.`

/**
 * Note data structure for conflict judgment.
 */
export interface NoteForJudgment {
  title: string
  problem: string | null
  content: string
}

/**
 * Judges a pair of notes for logical conflicts using LLM.
 *
 * @param noteA - First note to compare
 * @param noteB - Second note to compare
 * @param apiKey - OpenRouter API key
 * @returns Conflict judgment with reasoning, result, confidence, and explanation
 * @throws Error if LLM call fails (let caller handle retries)
 */
export async function judgeNotePair(
  noteA: NoteForJudgment,
  noteB: NoteForJudgment,
  apiKey: string
): Promise<ConflictJudgment> {
  const openrouter = createOpenRouter({ apiKey })

  const userPrompt = `Analyze these two notes for logical conflicts:

## Note A: "${noteA.title}"
Problem: ${noteA.problem || '(none)'}
Content:
${noteA.content}

---

## Note B: "${noteB.title}"
Problem: ${noteB.problem || '(none)'}
Content:
${noteB.content}

---

Determine if these notes contain conflicting claims. Remember: similar ideas are NOT conflicts. Only flag genuine logical incompatibilities where both claims cannot be true.`

  try {
    const { object } = await generateObject({
      model: openrouter('openai/gpt-4o-mini'),
      schema: conflictJudgmentSchema,
      schemaName: 'conflict_judgment',
      schemaDescription:
        'Judgment of whether two notes contain logically conflicting claims',
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.1,
      maxRetries: 0, // Let Inngest handle retries at the function level
    })

    return object
  } catch (error) {
    // Log detailed error information to help debug API issues
    if (APICallError.isInstance(error)) {
      console.error('[Conflicts] OpenRouter API Error:', {
        statusCode: error.statusCode,
        responseBody: error.responseBody,
        url: error.url,
        message: error.message,
      })
    } else {
      console.error('[Conflicts] Unexpected error:', error)
    }
    throw error // Re-throw to let Inngest handle retries
  }
}
