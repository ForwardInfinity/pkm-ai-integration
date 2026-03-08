import { getNoteLocally } from './note-cache'
import type { LocalNote } from './index'

/**
 * Build a soft-delete payload that includes any pending local changes.
 *
 * When a user deletes a note while unsynced edits exist in IndexedDB, the
 * server still holds the stale version. Including the local draft in the
 * soft-delete UPDATE ensures the server row is up-to-date, so Undo (restore)
 * returns the latest content instead of a stale snapshot.
 */
export function buildSoftDeletePayload(
  localNote: LocalNote | undefined,
  deletedAt: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = { deleted_at: deletedAt }

  if (!localNote || localNote.syncStatus === 'synced') {
    return payload
  }

  // Include all local fields so the server row reflects the latest draft
  payload.title = localNote.title
  payload.content = localNote.content
  payload.problem = localNote.problem
  payload.word_count = localNote.wordCount
  if (localNote.tags !== undefined) payload.tags = localNote.tags

  return payload
}

/**
 * Read a local note from IndexedDB and build the soft-delete payload.
 * Returns a plain `{ deleted_at }` payload on any read error.
 */
export async function buildSoftDeletePayloadForNote(
  noteId: string,
  deletedAt: string
): Promise<Record<string, unknown>> {
  try {
    const localNote = await getNoteLocally(noteId)
    return buildSoftDeletePayload(localNote, deletedAt)
  } catch {
    return { deleted_at: deletedAt }
  }
}
