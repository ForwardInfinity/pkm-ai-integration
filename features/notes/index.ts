// Notes feature public exports

// Types
export type {
  Note,
  NoteInsert,
  NoteUpdate,
  Conflict,
  ConflictInsert,
  ConflictUpdate,
  NoteLink,
  NoteLinkInsert,
  NoteLinkUpdate,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  ConflictStatus,
  UserRole,
  CreateNoteInput,
  UpdateNoteInput,
  RelatedNote,
  SearchResult,
  BacklinkNote,
  TagCount,
  PotentialConflict,
  NoteListItem as NoteListItemType,
  ConflictWithNotes,
} from './types'

// Hooks
export * from './hooks'

// Components (renamed to avoid conflict with NoteListItem type)
export { NoteList } from './components/note-list'
export { NoteListItem } from './components/note-list-item'
export { EmptyState } from './components/empty-state'
export { NoteEditor } from './components/note-editor'
