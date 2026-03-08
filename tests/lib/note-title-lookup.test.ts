import { describe, expect, it } from 'vitest'
import {
  buildNormalizedNoteTitleLookup,
  normalizeNoteTitle,
  resolveNoteByTitle,
} from '@/lib/note-title-lookup'

describe('note-title-lookup', () => {
  it('normalizes titles by trimming and lowercasing', () => {
    expect(normalizeNoteTitle('  Foo Bar  ')).toBe('foo bar')
  })

  it('keeps the first matching note by order and falls back when the source note is excluded', () => {
    const notes = [
      { id: 'note-newest', title: 'Foo' },
      { id: 'note-older', title: ' foo ' },
    ]

    expect(resolveNoteByTitle(notes, 'FOO')?.id).toBe('note-newest')

    const lookup = buildNormalizedNoteTitleLookup(notes, {
      excludeNoteId: 'note-newest',
    })

    expect(lookup.get('foo')?.id).toBe('note-older')
  })
})
