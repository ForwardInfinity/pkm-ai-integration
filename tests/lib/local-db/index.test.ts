import { beforeEach, describe, expect, it, vi } from 'vitest'

const openedDatabases = new Map<string, ReturnType<typeof createMockDatabase>>()

function createMockDatabase() {
  const stores = {
    notes: { clear: vi.fn().mockResolvedValue(undefined) },
    syncQueue: { clear: vi.fn().mockResolvedValue(undefined) },
    idMappings: { clear: vi.fn().mockResolvedValue(undefined) },
  }

  return {
    close: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn((storeName: keyof typeof stores) => stores[storeName]),
      done: Promise.resolve(),
    })),
    stores,
  }
}

vi.mock('idb', () => ({
  openDB: vi.fn((dbName: string) => {
    const database = createMockDatabase()
    openedDatabases.set(dbName, database)
    return Promise.resolve(database)
  }),
}))

import { clearDatabase, getDB, getLocalDbNameForUser, setActiveLocalDbUser } from '@/lib/local-db'

describe('local-db index', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    openedDatabases.clear()
    await setActiveLocalDbUser(null)
  })

  it('opens a separate IndexedDB database per authenticated user', async () => {
    await setActiveLocalDbUser('user-a')
    await getDB()

    await setActiveLocalDbUser('user-b')
    await getDB()

    const userADbName = getLocalDbNameForUser('user-a')
    const userBDbName = getLocalDbNameForUser('user-b')

    expect(openedDatabases.has(userADbName)).toBe(true)
    expect(openedDatabases.has(userBDbName)).toBe(true)
    expect(openedDatabases.get(userADbName)?.close).toHaveBeenCalledTimes(1)
  })

  it('clears only the requested user namespace', async () => {
    const userDbName = getLocalDbNameForUser('user-a')

    await clearDatabase('user-a')

    const database = openedDatabases.get(userDbName)
    expect(database).toBeDefined()
    expect(database?.transaction).toHaveBeenCalledWith(
      ['notes', 'syncQueue', 'idMappings'],
      'readwrite'
    )
    expect(database?.stores.notes.clear).toHaveBeenCalledTimes(1)
    expect(database?.stores.syncQueue.clear).toHaveBeenCalledTimes(1)
    expect(database?.stores.idMappings.clear).toHaveBeenCalledTimes(1)
  })
})
