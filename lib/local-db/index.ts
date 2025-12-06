import { openDB, DBSchema, IDBPDatabase } from 'idb'

export type SyncStatus = 'synced' | 'pending' | 'error'

export interface LocalNote {
  id: string
  tempId?: string // For new notes before server assigns ID
  title: string
  problem: string | null
  content: string
  wordCount: number
  updatedAt: number // Local timestamp for ordering
  syncStatus: SyncStatus
  serverVersion?: string // updated_at from server for conflict detection
}

export interface SyncQueueItem {
  id?: number // Auto-increment
  noteId: string
  operation: 'create' | 'update'
  data: Partial<LocalNote>
  timestamp: number
  retryCount: number
}

interface RefineryDB extends DBSchema {
  notes: {
    key: string
    value: LocalNote
    indexes: { 'by-sync-status': SyncStatus }
  }
  syncQueue: {
    key: number
    value: SyncQueueItem
    indexes: { 'by-note-id': string }
  }
}

const DB_NAME = 'refinery-notes'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<RefineryDB>> | null = null

export async function getDB(): Promise<IDBPDatabase<RefineryDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser')
  }

  if (!dbPromise) {
    dbPromise = openDB<RefineryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' })
          noteStore.createIndex('by-sync-status', 'syncStatus')
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          syncStore.createIndex('by-note-id', 'noteId')
        }
      },
    })
  }

  return dbPromise
}

export async function clearDatabase(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['notes', 'syncQueue'], 'readwrite')
  await Promise.all([tx.objectStore('notes').clear(), tx.objectStore('syncQueue').clear()])
  await tx.done
}
