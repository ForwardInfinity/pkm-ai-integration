import { describe, expectTypeOf, it } from 'vitest'
import type { NoteListItem } from '@/features/notes/types'
import type { Database } from '@/types/database.types'

type GetNotesByTagsRow =
  Database['public']['Functions']['get_notes_by_tags']['Returns'][number]

describe('get_notes_by_tags type contract', () => {
  it('matches NoteListItem exactly', () => {
    expectTypeOf<GetNotesByTagsRow>().toEqualTypeOf<NoteListItem>()
  })
})
