import { openDB, DBSchema, IDBPDatabase } from 'idb'

export type SyncStatus = 'synced' | 'pending' | 'error'

export interface LocalNote {
  id: string
  tempId?: string // For new notes before server assigns ID
  title: string
  problem: string | null
  content: string
  wordCount: number
  tags?: string[] // Extracted hashtags from content
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
  lastError?: string // Error message if sync failed after max retries
}

export interface IdMapping {
  tempId: string // Primary key
  serverId: string
  createdAt: number
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
  idMappings: {
    key: string
    value: IdMapping
    indexes: { 'by-server-id': string }
  }
}

const DB_NAME = 'refinery-notes'
const DB_VERSION = 2

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

        // ID mappings store (added in v2)
        if (!db.objectStoreNames.contains('idMappings')) {
          const mappingStore = db.createObjectStore('idMappings', {
            keyPath: 'tempId',
          })
          mappingStore.createIndex('by-server-id', 'serverId')
        }
      },
    })
  }

  return dbPromise
}

export async function clearDatabase(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['notes', 'syncQueue', 'idMappings'], 'readwrite')
  await Promise.all([
    tx.objectStore('notes').clear(),
    tx.objectStore('syncQueue').clear(),
    tx.objectStore('idMappings').clear(),
  ])
  await tx.done
}
