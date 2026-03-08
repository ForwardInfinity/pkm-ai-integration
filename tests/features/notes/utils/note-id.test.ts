import { describe, expect, it } from 'vitest'
import { getPersistedNoteId, isUnsavedNoteId } from '@/features/notes/utils/note-id'

describe('note-id helpers', () => {
  it('treats temp ids as unsaved', () => {
    expect(isUnsavedNoteId('temp_abc')).toBe(true)
    expect(getPersistedNoteId('temp_abc')).toBeNull()
  })

  it('treats new and null ids as unsaved', () => {
    expect(isUnsavedNoteId('new')).toBe(true)
    expect(isUnsavedNoteId(null)).toBe(true)
    expect(getPersistedNoteId('new')).toBeNull()
    expect(getPersistedNoteId(null)).toBeNull()
  })

  it('preserves real server ids', () => {
    expect(isUnsavedNoteId('note-123')).toBe(false)
    expect(getPersistedNoteId('note-123')).toBe('note-123')
  })
})
