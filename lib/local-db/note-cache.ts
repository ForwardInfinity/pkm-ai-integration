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
  // Use transaction for atomic delete+put to prevent race conditions
  const tx = db.transaction('notes', 'readwrite')
  const store = tx.objectStore('notes')

  const note = await store.get(tempId)
  if (note) {
    // Delete and put within same transaction (atomic)
    await store.delete(tempId)
    await store.put({
      ...note,
      id: serverId,
      tempId: undefined,
    })
  }

  await tx.done
}

export async function getAllLocalNotes(): Promise<LocalNote[]> {
  const db = await getDB()
  return db.getAll('notes')
}

// ID Mapping helpers for temp→server ID persistence

export async function saveIdMapping(
  tempId: string,
  serverId: string
): Promise<void> {
  const db = await getDB()
  await db.put('idMappings', {
    tempId,
    serverId,
    createdAt: Date.now(),
  })
}

export async function getIdMapping(
  tempId: string
): Promise<string | undefined> {
  const db = await getDB()
  const mapping = await db.get('idMappings', tempId)
  return mapping?.serverId
}

export async function getAllIdMappings(): Promise<Map<string, string>> {
  const db = await getDB()
  const mappings = await db.getAll('idMappings')
  return new Map(mappings.map((m) => [m.tempId, m.serverId]))
}
