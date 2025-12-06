import { getDB, LocalNote, SyncStatus } from './index'

export async function saveNoteLocally(note: LocalNote): Promise<void> {
  const db = await getDB()
  await db.put('notes', note)
}

export async function getNoteLocally(id: string): Promise<LocalNote | undefined> {
  const db = await getDB()
  return db.get('notes', id)
}

export async function deleteNoteLocally(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('notes', id)
}

export async function getPendingNotes(): Promise<LocalNote[]> {
  const db = await getDB()
  return db.getAllFromIndex('notes', 'by-sync-status', 'pending')
}

export async function getErrorNotes(): Promise<LocalNote[]> {
  const db = await getDB()
  return db.getAllFromIndex('notes', 'by-sync-status', 'error')
}

export async function markNoteSynced(id: string, serverVersion: string): Promise<void> {
  const db = await getDB()
  const note = await db.get('notes', id)
  if (note) {
    await db.put('notes', {
      ...note,
      syncStatus: 'synced' as SyncStatus,
      serverVersion,
    })
  }
}

export async function markNoteError(id: string): Promise<void> {
  const db = await getDB()
  const note = await db.get('notes', id)
  if (note) {
    await db.put('notes', {
      ...note,
      syncStatus: 'error' as SyncStatus,
    })
  }
}

export async function updateNoteIdMapping(
  tempId: string,
  serverId: string
): Promise<void> {
  const db = await getDB()
  const note = await db.get('notes', tempId)
  if (note) {
    // Delete the temp entry
    await db.delete('notes', tempId)
    // Create new entry with server ID
    await db.put('notes', {
      ...note,
      id: serverId,
      tempId: undefined,
    })
  }
}

export async function getAllLocalNotes(): Promise<LocalNote[]> {
  const db = await getDB()
  return db.getAll('notes')
}
