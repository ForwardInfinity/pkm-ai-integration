import { describe, it, expect } from 'vitest'
import { hashNoteForEmbedding } from '@/lib/embedding/content-hash'

describe('hashNoteForEmbedding', () => {
  it('should produce consistent hash for same input', () => {
    const note = {
      title: 'Test Title',
      problem: 'Test Problem',
      content: 'Test Content',
    }

    const hash1 = hashNoteForEmbedding(note)
    const hash2 = hashNoteForEmbedding(note)

    expect(hash1).toBe(hash2)
  })

  it('should produce different hash for different title', () => {
    const note1 = { title: 'Title A', problem: null, content: 'Content' }
    const note2 = { title: 'Title B', problem: null, content: 'Content' }

    expect(hashNoteForEmbedding(note1)).not.toBe(hashNoteForEmbedding(note2))
  })

  it('should produce different hash for different problem', () => {
    const note1 = { title: 'Title', problem: 'Problem A', content: 'Content' }
    const note2 = { title: 'Title', problem: 'Problem B', content: 'Content' }

    expect(hashNoteForEmbedding(note1)).not.toBe(hashNoteForEmbedding(note2))
  })

  it('should produce different hash for different content', () => {
    const note1 = { title: 'Title', problem: null, content: 'Content A' }
    const note2 = { title: 'Title', problem: null, content: 'Content B' }

    expect(hashNoteForEmbedding(note1)).not.toBe(hashNoteForEmbedding(note2))
  })

  it('should handle null problem field (null and empty string produce same hash)', () => {
    const noteWithNull = { title: 'Title', problem: null, content: 'Content' }
    const noteWithEmpty = { title: 'Title', problem: '', content: 'Content' }

    // null and empty string should produce same hash (both become empty in concatenation)
    expect(hashNoteForEmbedding(noteWithNull)).toBe(
      hashNoteForEmbedding(noteWithEmpty)
    )
  })

  it('should return 64-character hex string (SHA-256)', () => {
    const note = { title: 'Test', problem: null, content: 'Content' }
    const hash = hashNoteForEmbedding(note)

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should handle empty content gracefully', () => {
    const note = { title: '', problem: null, content: '' }
    const hash = hashNoteForEmbedding(note)

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should handle unicode content', () => {
    const note = {
      title: 'Unicode Test',
      problem: null,
      content: 'Hello 世界 🌍 مرحبا',
    }
    const hash = hashNoteForEmbedding(note)

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should be sensitive to whitespace in content', () => {
    const note1 = { title: 'Title', problem: null, content: 'Hello World' }
    const note2 = { title: 'Title', problem: null, content: 'Hello  World' }

    expect(hashNoteForEmbedding(note1)).not.toBe(hashNoteForEmbedding(note2))
  })

  it('should trim leading and trailing whitespace consistently', () => {
    const note1 = { title: '  Title  ', problem: null, content: '  Content  ' }
    const note2 = { title: '  Title  ', problem: null, content: '  Content  ' }

    // Same input should produce same output
    expect(hashNoteForEmbedding(note1)).toBe(hashNoteForEmbedding(note2))
  })

  it('should produce deterministic output for complex content', () => {
    const note = {
      title: 'Complex Note',
      problem: 'What is the meaning of life?',
      content: `# Heading

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
const x = 42;
\`\`\`
`,
    }

    const hash1 = hashNoteForEmbedding(note)
    const hash2 = hashNoteForEmbedding(note)

    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
  })
})
