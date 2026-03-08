import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { createClient } from '@/lib/supabase/client'

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

const DB_NAME_PREFIX = 'refinery-notes'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<RefineryDB>> | null = null
let activeDatabase: IDBPDatabase<RefineryDB> | null = null
let activeDatabaseName: string | null = null
let activeLocalDbUserId: string | null = null

function upgradeDatabase(db: IDBPDatabase<RefineryDB>): void {
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
}

function openRefineryDB(dbName: string): Promise<IDBPDatabase<RefineryDB>> {
  return openDB<RefineryDB>(dbName, DB_VERSION, {
    upgrade(db) {
      upgradeDatabase(db)
    },
  })
}

function resetActiveDatabase(): void {
  activeDatabase?.close()
  activeDatabase = null
  activeDatabaseName = null
  dbPromise = null
}

export function getLocalDbNameForUser(userId: string): string {
  return `${DB_NAME_PREFIX}-${userId}`
}

export function getActiveLocalDbUserId(): string | null {
  return activeLocalDbUserId
}

export async function getAuthenticatedLocalDbUserId(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

export async function setActiveLocalDbUser(userId: string | null): Promise<void> {
  if (activeLocalDbUserId === userId) {
    return
  }

  activeLocalDbUserId = userId
  resetActiveDatabase()
}

async function resolveLocalDbUserId(
  explicitUserId?: string | null
): Promise<string> {
  const userId =
    explicitUserId ??
    activeLocalDbUserId ??
    await getAuthenticatedLocalDbUserId()

  if (!userId) {
    throw new Error('Local database requires an authenticated user')
  }

  activeLocalDbUserId = userId
  return userId
}

export async function getDB(): Promise<IDBPDatabase<RefineryDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser')
  }

  const userId = await resolveLocalDbUserId()
  const dbName = getLocalDbNameForUser(userId)

  if (!dbPromise || activeDatabaseName !== dbName) {
    resetActiveDatabase()
    activeDatabaseName = dbName
    dbPromise = openRefineryDB(dbName)
      .then((db) => {
        activeDatabase = db
        return db
      })
      .catch((error) => {
        resetActiveDatabase()
        throw error
      })
  }

  return dbPromise
}

export async function clearDatabase(userId?: string): Promise<void> {
  const resolvedUserId = await resolveLocalDbUserId(userId)
  const dbName = getLocalDbNameForUser(resolvedUserId)
  const shouldReuseActiveDatabase = activeDatabaseName === dbName && activeDatabase !== null
  const db = shouldReuseActiveDatabase ? activeDatabase : await openRefineryDB(dbName)

  if (!db) {
    throw new Error('Failed to open local database')
  }

  const tx = db.transaction(['notes', 'syncQueue', 'idMappings'], 'readwrite')
  await Promise.all([
    tx.objectStore('notes').clear(),
    tx.objectStore('syncQueue').clear(),
    tx.objectStore('idMappings').clear(),
  ])
  await tx.done

  if (!shouldReuseActiveDatabase) {
    db.close()
  }
}
