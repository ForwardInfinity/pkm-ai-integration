import { describe, it, expect } from 'vitest'
import {
  extractTagsFromMarkdown,
  isValidTagName,
  normalizeTag,
  formatTag,
} from '@/lib/tags'

describe('extractTagsFromMarkdown', () => {
  it('should extract simple hashtags', () => {
    const result = extractTagsFromMarkdown('This is a #test note')
    expect(result).toEqual(['test'])
  })

  it('should extract multiple hashtags', () => {
    const result = extractTagsFromMarkdown('A note with #tag1 and #tag2 and #tag3')
    expect(result).toEqual(['tag1', 'tag2', 'tag3'])
  })

  it('should extract hashtags at start of line', () => {
    const result = extractTagsFromMarkdown('#important\nThis is important')
    expect(result).toEqual(['important'])
  })

  it('should extract hashtags with hyphens', () => {
    const result = extractTagsFromMarkdown('Use #to-do for tasks')
    expect(result).toEqual(['to-do'])
  })

  it('should extract hashtags with underscores', () => {
    const result = extractTagsFromMarkdown('Project #project_alpha is ready')
    expect(result).toEqual(['project_alpha'])
  })

  it('should extract hashtags with numbers (not at start)', () => {
    const result = extractTagsFromMarkdown('Goals for #goals2024')
    expect(result).toEqual(['goals2024'])
  })

  it('should normalize tags to lowercase', () => {
    const result = extractTagsFromMarkdown('#Important #URGENT #MixedCase')
    expect(result).toEqual(['important', 'mixedcase', 'urgent'])
  })

  it('should remove duplicate tags', () => {
    const result = extractTagsFromMarkdown('#test #Test #TEST')
    expect(result).toEqual(['test'])
  })

  it('should sort tags alphabetically', () => {
    const result = extractTagsFromMarkdown('#zebra #apple #mango')
    expect(result).toEqual(['apple', 'mango', 'zebra'])
  })

  it('should NOT extract tags starting with numbers', () => {
    const result = extractTagsFromMarkdown('Invalid #123tag and #456')
    expect(result).toEqual([])
  })

  it('should NOT extract tags without space before #', () => {
    const result = extractTagsFromMarkdown('word#attached is not a tag')
    expect(result).toEqual([])
  })

  it('should NOT extract empty tags', () => {
    const result = extractTagsFromMarkdown('Just a # alone')
    expect(result).toEqual([])
  })

  it('should NOT extract tags inside inline code', () => {
    const result = extractTagsFromMarkdown('This `#code` is not a tag but #real is')
    expect(result).toEqual(['real'])
  })

  it('should NOT extract tags inside fenced code blocks', () => {
    const markdown = `
Some text #valid

\`\`\`javascript
const x = '#notag'
// #comment
\`\`\`

More text #alsovalid
`
    const result = extractTagsFromMarkdown(markdown)
    expect(result).toEqual(['alsovalid', 'valid'])
  })

  it('should NOT extract URL anchors', () => {
    const result = extractTagsFromMarkdown('Visit https://example.com#section for more')
    expect(result).toEqual([])
  })

  it('should NOT extract URL anchors with complex URLs', () => {
    const result = extractTagsFromMarkdown('See [link](https://example.com/page#anchor) here')
    expect(result).toEqual([])
  })

  it('should handle tags after newlines', () => {
    const result = extractTagsFromMarkdown('Line 1\n#tag1\nLine 3')
    expect(result).toEqual(['tag1'])
  })

  it('should handle tags after tabs', () => {
    const result = extractTagsFromMarkdown('Item\t#tagged')
    expect(result).toEqual(['tagged'])
  })

  it('should return empty array for empty content', () => {
    expect(extractTagsFromMarkdown('')).toEqual([])
    expect(extractTagsFromMarkdown(null as unknown as string)).toEqual([])
    expect(extractTagsFromMarkdown(undefined as unknown as string)).toEqual([])
  })

  it('should handle single character tags', () => {
    const result = extractTagsFromMarkdown('Tag #a is valid')
    expect(result).toEqual(['a'])
  })

  it('should handle tags followed by punctuation', () => {
    const result = extractTagsFromMarkdown('#tag1, #tag2. #tag3!')
    expect(result).toEqual(['tag1', 'tag2', 'tag3'])
  })

  it('should handle complex mixed content', () => {
    const markdown = `
# Heading

This is a note about #programming with some #code:

\`\`\`python
def hello():
    # #comment not a tag
    return "world"
\`\`\`

Check out https://example.com#section for #reference.

Tags: #final-thoughts #summary
`
    const result = extractTagsFromMarkdown(markdown)
    expect(result).toEqual(['code', 'final-thoughts', 'programming', 'reference', 'summary'])
  })
})

describe('isValidTagName', () => {
  it('should return true for valid tag names', () => {
    expect(isValidTagName('test')).toBe(true)
    expect(isValidTagName('Test')).toBe(true)
    expect(isValidTagName('test123')).toBe(true)
    expect(isValidTagName('test-tag')).toBe(true)
    expect(isValidTagName('test_tag')).toBe(true)
    expect(isValidTagName('a')).toBe(true)
  })

  it('should return false for invalid tag names', () => {
    expect(isValidTagName('123test')).toBe(false)
    expect(isValidTagName('123')).toBe(false)
    expect(isValidTagName('')).toBe(false)
    expect(isValidTagName('#test')).toBe(false)
    expect(isValidTagName('test tag')).toBe(false)
    expect(isValidTagName('test.tag')).toBe(false)
  })
})

describe('normalizeTag', () => {
  it('should convert to lowercase', () => {
    expect(normalizeTag('TEST')).toBe('test')
    expect(normalizeTag('MixedCase')).toBe('mixedcase')
  })

  it('should trim whitespace', () => {
    expect(normalizeTag(' tag ')).toBe('tag')
    expect(normalizeTag('\ttag\n')).toBe('tag')
  })
})

describe('formatTag', () => {
  it('should add # prefix', () => {
    expect(formatTag('test')).toBe('#test')
    expect(formatTag('my-tag')).toBe('#my-tag')
  })
})
