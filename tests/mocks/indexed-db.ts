import { vi } from 'vitest'

// In-memory store for fake IndexedDB
const stores: Record<string, Map<string, unknown>> = {
  notes: new Map(),
  syncQueue: new Map(),
}

let autoIncrementId = 1

// Mock IDB database
export const mockIDBDatabase = {
  get: vi.fn((storeName: string, key: string) => {
    return Promise.resolve(stores[storeName]?.get(key))
  }),
  
  put: vi.fn((storeName: string, value: { id?: string | number }) => {
    const key = value.id ?? `auto_${autoIncrementId++}`
    stores[storeName]?.set(String(key), { ...value, id: key })
    return Promise.resolve(key)
  }),
  
  add: vi.fn((storeName: string, value: { id?: string | number }) => {
    const key = value.id ?? autoIncrementId++
    stores[storeName]?.set(String(key), { ...value, id: key })
    return Promise.resolve(key)
  }),
  
  delete: vi.fn((storeName: string, key: string) => {
    stores[storeName]?.delete(key)
    return Promise.resolve()
  }),
  
  getAll: vi.fn((storeName: string) => {
    return Promise.resolve(Array.from(stores[storeName]?.values() ?? []))
  }),
  
  getAllFromIndex: vi.fn((storeName: string, _indexName: string, value: string) => {
    const allItems = Array.from(stores[storeName]?.values() ?? []) as Record<string, unknown>[]
    // Filter based on index - simplified for testing
    return Promise.resolve(
      allItems.filter((item) => {
        if (_indexName === 'by-sync-status') return item.syncStatus === value
        if (_indexName === 'by-note-id') return item.noteId === value
        return false
      })
    )
  }),
  
  transaction: vi.fn(() => ({
    objectStore: vi.fn((storeName: string) => ({
      clear: vi.fn(() => {
        stores[storeName]?.clear()
        return Promise.resolve()
      }),
    })),
    done: Promise.resolve(),
  })),
}

// Reset stores for clean test state
export function resetMockIDB() {
  stores.notes = new Map()
  stores.syncQueue = new Map()
  autoIncrementId = 1
  vi.clearAllMocks()
}

// Helper to seed test data
export function seedMockIDB(storeName: string, data: Array<{ id: string | number }>) {
  data.forEach((item) => {
    stores[storeName]?.set(String(item.id), item)
  })
}

// Get current store state (for assertions)
export function getMockIDBStore(storeName: string) {
  return Array.from(stores[storeName]?.values() ?? [])
}

// Mock the openDB function from idb
export const openDBMock = vi.fn(() => Promise.resolve(mockIDBDatabase))
