export function isUnsavedNoteId(noteId: string | null | undefined): boolean {
  return !noteId || noteId === 'new' || noteId.startsWith('temp_')
}

export function getPersistedNoteId(
  noteId: string | null | undefined
): string | null {
  return isUnsavedNoteId(noteId) ? null : noteId ?? null
}
