import { describe, it, expect } from 'vitest'
import {
  extractWikiLinks,
  extractUniqueLinkTitles,
  hasWikiLinks,
  replaceWikiLinks,
  wikiLinksToMarkdownLinks,
} from '@/lib/link-parser'

describe('link-parser', () => {
  describe('extractWikiLinks', () => {
    it('extracts simple wikilinks', () => {
      const markdown = 'Check out [[My Note]] for more info.'
      const links = extractWikiLinks(markdown)

      expect(links).toHaveLength(1)
      expect(links[0]).toEqual({
        title: 'My Note',
        displayText: null,
        fullMatch: '[[My Note]]',
        startIndex: 10,
        endIndex: 21,
      })
    })

    it('extracts wikilinks with display text', () => {
      const markdown = 'See [[Note Title|this note]] for details.'
      const links = extractWikiLinks(markdown)

      expect(links).toHaveLength(1)
      expect(links[0]).toEqual({
        title: 'Note Title',
        displayText: 'this note',
        fullMatch: '[[Note Title|this note]]',
        startIndex: 4,
        endIndex: 28,
      })
    })

    it('extracts multiple wikilinks', () => {
      const markdown = 'Check [[First Note]] and [[Second Note|other]] together.'
      const links = extractWikiLinks(markdown)

      expect(links).toHaveLength(2)
      expect(links[0].title).toBe('First Note')
      expect(links[1].title).toBe('Second Note')
      expect(links[1].displayText).toBe('other')
    })

    it('handles wikilinks with special characters in title', () => {
      const markdown = 'See [[Note: A Special Title]] here.'
      const links = extractWikiLinks(markdown)

      expect(links).toHaveLength(1)
      expect(links[0].title).toBe('Note: A Special Title')
    })

    it('handles empty content', () => {
      const links = extractWikiLinks('')
      expect(links).toHaveLength(0)
    })

    it('handles content without wikilinks', () => {
      const markdown = 'This is regular markdown with no links.'
      const links = extractWikiLinks(markdown)
      expect(links).toHaveLength(0)
    })

    it('handles wikilinks at start and end of content', () => {
      const markdown = '[[Start Note]] content [[End Note]]'
      const links = extractWikiLinks(markdown)

      expect(links).toHaveLength(2)
      expect(links[0].title).toBe('Start Note')
      expect(links[1].title).toBe('End Note')
    })

    it('trims whitespace from titles', () => {
      const markdown = '[[  Spaced Title  ]]'
      const links = extractWikiLinks(markdown)

      expect(links).toHaveLength(1)
      expect(links[0].title).toBe('Spaced Title')
    })

    it('trims whitespace from display text', () => {
      const markdown = '[[Title|  spaced text  ]]'
      const links = extractWikiLinks(markdown)

      expect(links).toHaveLength(1)
      expect(links[0].displayText).toBe('spaced text')
    })
  })

  describe('extractUniqueLinkTitles', () => {
    it('returns unique titles only', () => {
      const markdown = '[[Note A]] and [[Note B]] and [[Note A]] again.'
      const titles = extractUniqueLinkTitles(markdown)

      expect(titles).toHaveLength(2)
      expect(titles).toContain('Note A')
      expect(titles).toContain('Note B')
    })

    it('returns empty array for no links', () => {
      const titles = extractUniqueLinkTitles('No links here.')
      expect(titles).toHaveLength(0)
    })
  })

  describe('hasWikiLinks', () => {
    it('returns true when wikilinks exist', () => {
      expect(hasWikiLinks('Check [[My Note]] out.')).toBe(true)
    })

    it('returns false when no wikilinks exist', () => {
      expect(hasWikiLinks('No wikilinks here.')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(hasWikiLinks('')).toBe(false)
    })

    it('returns false for partial brackets', () => {
      expect(hasWikiLinks('This is [not] a link')).toBe(false)
      expect(hasWikiLinks('Neither is [[this')).toBe(false)
    })
  })

  describe('replaceWikiLinks', () => {
    it('replaces wikilinks with custom format', () => {
      const markdown = 'See [[Note A]] and [[Note B|display]].'
      const result = replaceWikiLinks(markdown, (link) => `<${link.title}>`)

      expect(result).toBe('See <Note A> and <Note B>.')
    })

    it('provides all link properties to replacer', () => {
      const markdown = 'Check [[Title|Display]] here.'
      const links: Array<{ title: string; displayText: string | null }> = []

      replaceWikiLinks(markdown, (link) => {
        links.push({ title: link.title, displayText: link.displayText })
        return link.fullMatch
      })

      expect(links[0]).toEqual({ title: 'Title', displayText: 'Display' })
    })

    it('handles multiple adjacent links', () => {
      const markdown = '[[A]][[B]][[C]]'
      const result = replaceWikiLinks(markdown, (link) => `(${link.title})`)

      expect(result).toBe('(A)(B)(C)')
    })
  })

  describe('wikiLinksToMarkdownLinks', () => {
    it('converts wikilinks to markdown links', () => {
      const markdown = 'See [[My Note]] for details.'
      const result = wikiLinksToMarkdownLinks(markdown, (title) => `/notes/${title}`)

      expect(result).toBe('See [My Note](/notes/My Note) for details.')
    })

    it('uses display text when available', () => {
      const markdown = 'See [[My Note|click here]] for details.'
      const result = wikiLinksToMarkdownLinks(markdown, (title) => `/notes/${title}`)

      expect(result).toBe('See [click here](/notes/My Note) for details.')
    })

    it('converts multiple links', () => {
      const markdown = '[[A]] and [[B|bee]]'
      const result = wikiLinksToMarkdownLinks(markdown, (title) => `/${title}`)

      expect(result).toBe('[A](/A) and [bee](/B)')
    })
  })
})
