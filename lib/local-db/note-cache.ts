import {
  getDB,
  LocalNote,
  SyncStatus,
} from './index'

const CURRENT_SESSION_TEMP_DRAFT_KEY = 'refinery-current-session-temp-draft'

export interface LocalNoteSeed {
  title: string
  problem: string | null
  content: string
  wordCount: number
  tags?: string[]
  serverVersion?: string
}

export interface LocalNotePatch {
  title?: string
  problem?: string | null
  content?: string
  wordCount?: number
  tags?: string[]
}

export interface LocalNoteConflictDetails {
  serverVersion?: string
  message?: string
}

const noteWriteLocks = new Map<string, Promise<void>>()

function createSeededLocalNote(
  noteId: string,
  seed?: LocalNoteSeed,
  timestamp = Date.now()
): LocalNote {
  return {
    id: noteId,
    tempId: noteId.startsWith('temp_') ? noteId : undefined,
    title: seed?.title ?? '',
    problem: seed?.problem ?? null,
    content: seed?.content ?? '',
    wordCount: seed?.wordCount ?? 0,
    tags: seed?.tags ?? [],
    updatedAt: timestamp,
    syncStatus: 'pending',
    serverVersion: seed?.serverVersion,
  }
}

async function withNoteWriteLock<T>(
  noteId: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = noteWriteLocks.get(noteId) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(operation)
  const tracked = current.then(() => undefined, () => undefined)

  noteWriteLocks.set(noteId, tracked)

  try {
    return await current
  } finally {
    if (noteWriteLocks.get(noteId) === tracked) {
      noteWriteLocks.delete(noteId)
    }
  }
}

async function updateNoteRecord(
  noteId: string,
  updater: (
    note: LocalNote | undefined
  ) => LocalNote | undefined | Promise<LocalNote | undefined>
): Promise<LocalNote | undefined> {
  return withNoteWriteLock(noteId, async () => {
    const db = await getDB()
    const tx = db.transaction('notes', 'readwrite')
    const store = tx.objectStore('notes')
    const note = await store.get(noteId)
    const next = await updater(note)

    if (next) {
      await store.put(next)
    }

    await tx.done
    return next
  })
}

export async function saveNoteLocally(note: LocalNote): Promise<void> {
  await updateNoteRecord(note.id, () => note)
}

export async function mergeNoteLocally(
  noteId: string,
  patch: LocalNotePatch,
  options: {
    seed?: LocalNoteSeed
    timestamp?: number
  } = {}
): Promise<LocalNote> {
  const merged = await updateNoteRecord(noteId, (existing) => {
    const timestamp = options.timestamp ?? Date.now()
    const base = existing ?? createSeededLocalNote(noteId, options.seed, timestamp)

    return {
      ...base,
      id: noteId,
      title: patch.title ?? base.title,
      problem: patch.problem !== undefined ? patch.problem : base.problem,
      content: patch.content ?? base.content,
      wordCount: patch.wordCount ?? base.wordCount,
      tags: patch.tags ?? base.tags ?? [],
      updatedAt: timestamp,
      syncStatus: 'pending' as SyncStatus,
      tempId: noteId.startsWith('temp_') ? noteId : base.tempId,
      serverVersion: base.serverVersion ?? options.seed?.serverVersion,
      syncError: undefined,
      syncErrorMessage: undefined,
      latestServerVersion: undefined,
    }
  })

  if (!merged) {
    throw new Error(`Failed to merge local note: ${noteId}`)
  }

  return merged
}

export async function getNoteLocally(id: string): Promise<LocalNote | undefined> {
  const db = await getDB()
  return db.get('notes', id)
}

export async function deleteNoteLocally(id: string): Promise<void> {
  await withNoteWriteLock(id, async () => {
    const db = await getDB()
    await db.delete('notes', id)
  })
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
  await updateNoteRecord(id, (note) => {
    if (!note) {
      return note
    }

    return {
      ...note,
      syncStatus: 'synced' as SyncStatus,
      serverVersion,
      syncError: undefined,
      syncErrorMessage: undefined,
      latestServerVersion: undefined,
    }
  })
}

export async function markNoteError(id: string): Promise<void> {
  await updateNoteRecord(id, (note) => {
    if (!note) {
      return note
    }

    return {
      ...note,
      syncStatus: 'error' as SyncStatus,
      syncError: undefined,
      syncErrorMessage: undefined,
      latestServerVersion: undefined,
    }
  })
}

export async function markNoteConflict(
  id: string,
  details: LocalNoteConflictDetails = {}
): Promise<void> {
  await updateNoteRecord(id, (note) => {
    if (!note) {
      return note
    }

    return {
      ...note,
      syncStatus: 'error' as SyncStatus,
      syncError: 'version-conflict',
      syncErrorMessage: details.message,
      latestServerVersion: details.serverVersion,
    }
  })
}

export async function updateNoteIdMapping(
  tempId: string,
  serverId: string
): Promise<void> {
  await withNoteWriteLock(tempId, async () => {
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
  })
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

export function getCurrentSessionTempDraftId(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(CURRENT_SESSION_TEMP_DRAFT_KEY)
}

export function setCurrentSessionTempDraftId(tempId: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(CURRENT_SESSION_TEMP_DRAFT_KEY, tempId)
}

export function clearCurrentSessionTempDraftId(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(CURRENT_SESSION_TEMP_DRAFT_KEY)
}
