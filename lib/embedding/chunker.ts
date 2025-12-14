/**
 * Text chunking for semantic embeddings
 *
 * Splits text into overlapping chunks for better semantic coverage of long documents.
 * Uses hierarchical splitting (paragraphs > lines > sentences > words) to preserve
 * natural boundaries while respecting size limits.
 */

export interface Chunk {
  index: number
  start: number // Character offset start
  end: number // Character offset end
  text: string
}

export interface ChunkOptions {
  chunkSizeChars?: number
  overlapChars?: number
}

const DEFAULT_CHUNK_SIZE = 2000
const DEFAULT_OVERLAP = 200

// Separators in order of preference (most semantic to least)
const SEPARATORS = ['\n\n', '\n', '. ', ' '] as const

/**
 * Splits text into overlapping chunks for embedding
 *
 * @param rawText - The full text to chunk
 * @param options - Chunking options
 * @returns Array of chunks with offsets
 */
export function chunkText(rawText: string, options: ChunkOptions = {}): Chunk[] {
  const { chunkSizeChars = DEFAULT_CHUNK_SIZE, overlapChars = DEFAULT_OVERLAP } = options

  // Handle empty or whitespace-only text
  const trimmedText = rawText.trim()
  if (!trimmedText) {
    return []
  }

  // If text fits in one chunk, return single chunk
  if (trimmedText.length <= chunkSizeChars) {
    return [
      {
        index: 0,
        start: rawText.indexOf(trimmedText),
        end: rawText.indexOf(trimmedText) + trimmedText.length,
        text: trimmedText,
      },
    ]
  }

  const chunks: Chunk[] = []
  let currentStart = 0

  while (currentStart < rawText.length) {
    // Find the end of this chunk
    let chunkEnd = Math.min(currentStart + chunkSizeChars, rawText.length)

    // If we're not at the end, find a good break point
    if (chunkEnd < rawText.length) {
      chunkEnd = findBreakPoint(rawText, currentStart, chunkEnd)
    }

    // Extract and trim the chunk text
    const chunkText = rawText.slice(currentStart, chunkEnd).trim()

    // Only add non-empty chunks
    if (chunkText) {
      // Find actual start position (accounting for leading whitespace)
      const actualStart = rawText.indexOf(chunkText, currentStart)

      chunks.push({
        index: chunks.length,
        start: actualStart,
        end: actualStart + chunkText.length,
        text: chunkText,
      })
    }

    // Move to next chunk with overlap
    // Calculate next start: go back by overlap amount from chunk end
    const nextStart = chunkEnd - overlapChars

    // Ensure we make progress (avoid infinite loop)
    if (nextStart <= currentStart) {
      currentStart = chunkEnd
    } else {
      currentStart = nextStart
    }

    // Safety: if we're past the end, stop
    if (currentStart >= rawText.length) {
      break
    }
  }

  return chunks
}

/**
 * Finds a good break point for a chunk, preferring natural boundaries
 */
function findBreakPoint(text: string, start: number, maxEnd: number): number {
  // Search window: look back from maxEnd for a separator
  const searchStart = Math.max(start, maxEnd - Math.floor((maxEnd - start) * 0.3))
  const searchText = text.slice(searchStart, maxEnd)

  // Try each separator in order of preference
  for (const separator of SEPARATORS) {
    const lastIndex = searchText.lastIndexOf(separator)
    if (lastIndex !== -1) {
      // Found a separator - return position after it
      const breakPoint = searchStart + lastIndex + separator.length
      // Only use if it gives us a reasonable chunk size (at least 50% of target)
      if (breakPoint - start >= (maxEnd - start) * 0.5) {
        return breakPoint
      }
    }
  }

  // No good separator found - break at maxEnd
  return maxEnd
}

/**
 * Computes mean pooling of embeddings to create aggregate embedding
 *
 * @param embeddings - Array of embedding vectors
 * @returns Single aggregated embedding vector
 */
export function meanPoolEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error('Cannot pool empty embeddings array')
  }

  if (embeddings.length === 1) {
    return embeddings[0]
  }

  const dimensions = embeddings[0].length
  const result = new Array(dimensions).fill(0)

  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      result[i] += embedding[i]
    }
  }

  // Divide by count for mean
  for (let i = 0; i < dimensions; i++) {
    result[i] /= embeddings.length
  }

  return result
}
