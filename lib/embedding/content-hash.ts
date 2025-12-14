import { createHash } from 'crypto'

/**
 * Generates a SHA-256 hash of note content for embedding idempotency.
 *
 * The hash is computed from: title + "\n\n" + (problem ?? "") + "\n\n" + content
 * This matches the concatenation used for embedding generation.
 *
 * @param note - Note data containing title, problem, and content
 * @returns Hex-encoded SHA-256 hash string (64 characters)
 */
export function hashNoteForEmbedding(note: {
  title: string
  problem: string | null
  content: string
}): string {
  const { title, problem, content } = note

  // Combine fields with double newline separator (matches embedding text format)
  // Only trim at the very ends, preserve internal whitespace
  const textToHash = `${title}\n\n${problem ?? ''}\n\n${content}`.trim()

  return createHash('sha256').update(textToHash, 'utf8').digest('hex')
}

/**
 * Type for note fields required for hash computation
 */
export type HashableNote = {
  title: string
  problem: string | null
  content: string
}
