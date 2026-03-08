import { describe, it, expect } from 'vitest'
import { buildSoftDeletePayload } from '@/lib/local-db/flush-before-delete'
import type { LocalNote } from '@/lib/local-db'

const DELETED_AT = '2024-06-15T12:00:00.000Z'

function makeLocalNote(overrides: Partial<LocalNote> = {}): LocalNote {
  return {
    id: 'note-1',
    title: 'Draft title',
    problem: 'Draft problem',
    content: '# Hello world',
    wordCount: 2,
    tags: ['tag1'],
    updatedAt: Date.now(),
    syncStatus: 'pending',
    ...overrides,
  }
}

describe('buildSoftDeletePayload', () => {
  it('returns only deleted_at when no local note exists', () => {
    const payload = buildSoftDeletePayload(undefined, DELETED_AT)
    expect(payload).toEqual({ deleted_at: DELETED_AT })
  })

  it('returns only deleted_at when local note is already synced', () => {
    const note = makeLocalNote({ syncStatus: 'synced' })
    const payload = buildSoftDeletePayload(note, DELETED_AT)
    expect(payload).toEqual({ deleted_at: DELETED_AT })
  })

  it('includes pending local changes alongside deleted_at', () => {
    const note = makeLocalNote({ syncStatus: 'pending' })
    const payload = buildSoftDeletePayload(note, DELETED_AT)

    expect(payload).toEqual({
      deleted_at: DELETED_AT,
      title: 'Draft title',
      content: '# Hello world',
      problem: 'Draft problem',
      word_count: 2,
      tags: ['tag1'],
    })
  })

  it('includes error-status local changes alongside deleted_at', () => {
    const note = makeLocalNote({ syncStatus: 'error' })
    const payload = buildSoftDeletePayload(note, DELETED_AT)

    expect(payload.title).toBe('Draft title')
    expect(payload.content).toBe('# Hello world')
    expect(payload.deleted_at).toBe(DELETED_AT)
  })

  it('omits tags field when local note has no tags', () => {
    const note = makeLocalNote({ syncStatus: 'pending', tags: undefined })
    const payload = buildSoftDeletePayload(note, DELETED_AT)

    expect(payload.tags).toBeUndefined()
    expect(payload.title).toBe('Draft title')
  })

  it('includes null problem when local draft has null problem', () => {
    const note = makeLocalNote({ syncStatus: 'pending', problem: null })
    const payload = buildSoftDeletePayload(note, DELETED_AT)

    expect(payload.problem).toBeNull()
  })
})
