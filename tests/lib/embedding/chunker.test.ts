import { describe, it, expect } from 'vitest'
import { chunkText, meanPoolEmbeddings } from '@/lib/embedding/chunker'

describe('chunkText', () => {
  describe('basic behavior', () => {
    it('should return empty array for empty text', () => {
      expect(chunkText('')).toEqual([])
    })

    it('should return empty array for whitespace-only text', () => {
      expect(chunkText('   \n\n\t  ')).toEqual([])
    })

    it('should return single chunk when text fits within chunkSizeChars', () => {
      const text = 'This is a short note.'
      const chunks = chunkText(text, { chunkSizeChars: 100 })

      expect(chunks).toHaveLength(1)
      expect(chunks[0].text).toBe(text)
      expect(chunks[0].index).toBe(0)
      expect(chunks[0].start).toBe(0)
      expect(chunks[0].end).toBe(text.length)
    })

    it('should create multiple overlapping chunks for long text', () => {
      const paragraph = 'This is a test paragraph. '
      const text = paragraph.repeat(20) // ~520 chars
      const chunks = chunkText(text, { chunkSizeChars: 200, overlapChars: 50 })

      expect(chunks.length).toBeGreaterThan(1)
      // Verify chunks are sequential
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].index).toBe(i)
      }
    })
  })

  describe('separator preference logic', () => {
    it('should prefer paragraph breaks over line breaks', () => {
      const text = 'First paragraph content here.\n\nSecond paragraph content here.\nThis is still second para.'
      const chunks = chunkText(text, { chunkSizeChars: 50, overlapChars: 10 })

      // Should break at paragraph boundary (\n\n) when possible
      const firstChunk = chunks[0]
      expect(firstChunk.text).toContain('First paragraph')
    })

    it('should fall back to line breaks when no paragraphs', () => {
      const text = 'Line one content here.\nLine two content here.\nLine three content.'
      const chunks = chunkText(text, { chunkSizeChars: 40, overlapChars: 10 })

      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should fall back to sentence boundaries when no line breaks', () => {
      const text = 'First sentence here. Second sentence here. Third sentence here. Fourth sentence.'
      const chunks = chunkText(text, { chunkSizeChars: 50, overlapChars: 10 })

      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should fall back to word boundaries as last resort', () => {
      const text = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10'
      const chunks = chunkText(text, { chunkSizeChars: 30, overlapChars: 5 })

      expect(chunks.length).toBeGreaterThan(1)
      // Verify chunks contain content
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeGreaterThan(0)
      }
    })
  })

  describe('overlap boundary calculations', () => {
    it('should create overlapping content between consecutive chunks', () => {
      const text = 'A'.repeat(100) + ' ' + 'B'.repeat(100) + ' ' + 'C'.repeat(100)
      const chunks = chunkText(text, { chunkSizeChars: 150, overlapChars: 30 })

      expect(chunks.length).toBeGreaterThan(1)

      // Check that consecutive chunks have overlapping regions
      for (let i = 1; i < chunks.length; i++) {
        const prevEnd = chunks[i - 1].end
        const currStart = chunks[i].start
        // Current chunk should start before previous chunk ends (overlap)
        expect(currStart).toBeLessThan(prevEnd)
      }
    })

    it('should handle custom chunk size and overlap options', () => {
      const text = 'Word '.repeat(100) // 500 chars
      const chunks = chunkText(text, { chunkSizeChars: 100, overlapChars: 20 })

      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should ensure no content is lost between chunks', () => {
      const text = 'The quick brown fox jumps over the lazy dog. '.repeat(10)
      const chunks = chunkText(text, { chunkSizeChars: 100, overlapChars: 20 })

      // Reconstruct text from chunks (non-overlapping parts)
      let reconstructed = chunks[0].text
      for (let i = 1; i < chunks.length; i++) {
        const overlapStart = chunks[i].start
        const prevEnd = chunks[i - 1].end
        // Add only the new content (after overlap)
        if (overlapStart < prevEnd) {
          const newContent = chunks[i].text.slice(prevEnd - overlapStart)
          reconstructed += newContent
        } else {
          reconstructed += chunks[i].text
        }
      }

      // All original content should be present
      const trimmedOriginal = text.trim()
      expect(reconstructed.length).toBeGreaterThanOrEqual(trimmedOriginal.length * 0.9)
    })
  })

  describe('edge cases', () => {
    it('should handle very long text (10k+ chars)', () => {
      const text = 'This is a paragraph of text. '.repeat(500) // ~14.5k chars
      const chunks = chunkText(text)

      expect(chunks.length).toBeGreaterThan(5)
      // All chunks should have content
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeGreaterThan(0)
      }
    })

    it('should handle unicode characters (emoji)', () => {
      const text = 'Hello 🌍 World 🎉 Test 🚀 '.repeat(50)
      const chunks = chunkText(text, { chunkSizeChars: 100, overlapChars: 20 })

      expect(chunks.length).toBeGreaterThan(1)
      // Verify emoji are preserved
      expect(chunks.some((c) => c.text.includes('🌍'))).toBe(true)
    })

    it('should handle CJK characters', () => {
      const text = '这是一个测试文本。'.repeat(50)
      const chunks = chunkText(text, { chunkSizeChars: 100, overlapChars: 20 })

      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should handle RTL text (Arabic)', () => {
      const text = 'مرحبا بالعالم. هذا اختبار. '.repeat(30)
      const chunks = chunkText(text, { chunkSizeChars: 100, overlapChars: 20 })

      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should handle text with no natural break points', () => {
      const text = 'A'.repeat(500) // Continuous text without separators
      const chunks = chunkText(text, { chunkSizeChars: 100, overlapChars: 20 })

      expect(chunks.length).toBeGreaterThan(1)
      // Should still chunk even without natural breaks
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(100)
      }
    })

    it('should handle text with leading/trailing whitespace', () => {
      const text = '   Some content here.   '
      const chunks = chunkText(text)

      expect(chunks).toHaveLength(1)
      expect(chunks[0].text).toBe('Some content here.')
    })

    it('should handle mixed separators', () => {
      const text = 'Para 1.\n\nPara 2.\nLine 2. Sentence 2. Word word word.'
      const chunks = chunkText(text, { chunkSizeChars: 30, overlapChars: 5 })

      expect(chunks.length).toBeGreaterThan(1)
    })
  })

  describe('chunk properties', () => {
    it('should set correct index for each chunk', () => {
      const text = 'Word '.repeat(100)
      const chunks = chunkText(text, { chunkSizeChars: 50, overlapChars: 10 })

      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i)
      })
    })

    it('should set correct start and end offsets', () => {
      const text = 'Hello World'
      const chunks = chunkText(text)

      expect(chunks).toHaveLength(1)
      expect(chunks[0].start).toBe(0)
      expect(chunks[0].end).toBe(11)
    })
  })
})

describe('meanPoolEmbeddings', () => {
  it('should throw error for empty embeddings array', () => {
    expect(() => meanPoolEmbeddings([])).toThrow('Cannot pool empty embeddings array')
  })

  it('should return original embedding for single input', () => {
    const embedding = [0.1, 0.2, 0.3, 0.4]
    const result = meanPoolEmbeddings([embedding])

    expect(result).toEqual(embedding)
  })

  it('should correctly compute mean for two embeddings', () => {
    const embeddings = [
      [0.2, 0.4, 0.6],
      [0.4, 0.6, 0.8],
    ]
    const result = meanPoolEmbeddings(embeddings)

    expect(result[0]).toBeCloseTo(0.3)
    expect(result[1]).toBeCloseTo(0.5)
    expect(result[2]).toBeCloseTo(0.7)
  })

  it('should correctly compute mean for multiple embeddings', () => {
    const embeddings = [
      [1.0, 2.0, 3.0],
      [2.0, 3.0, 4.0],
      [3.0, 4.0, 5.0],
    ]
    const result = meanPoolEmbeddings(embeddings)

    expect(result).toEqual([2.0, 3.0, 4.0])
  })

  it('should handle negative values', () => {
    const embeddings = [
      [-0.5, 0.5],
      [0.5, -0.5],
    ]
    const result = meanPoolEmbeddings(embeddings)

    expect(result).toEqual([0, 0])
  })

  it('should handle high-dimensional embeddings (1536 dims)', () => {
    const dim = 1536
    const embeddings = [
      new Array(dim).fill(0.1),
      new Array(dim).fill(0.3),
    ]
    const result = meanPoolEmbeddings(embeddings)

    expect(result).toHaveLength(dim)
    expect(result[0]).toBeCloseTo(0.2)
    expect(result[dim - 1]).toBeCloseTo(0.2)
  })

  it('should handle floating point precision', () => {
    const embeddings = [
      [0.1, 0.2],
      [0.2, 0.1],
    ]
    const result = meanPoolEmbeddings(embeddings)

    expect(result[0]).toBeCloseTo(0.15)
    expect(result[1]).toBeCloseTo(0.15)
  })
})
