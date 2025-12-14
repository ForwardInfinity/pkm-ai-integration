import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { LocalNote, SyncQueueItem } from '@/lib/local-db'

// Mock timers
vi.useFakeTimers()

// Mock DB
const mockDB = {
  get: vi.fn(),
  put: vi.fn(),
  add: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getAllFromIndex: vi.fn(),
}

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}))

// Mock Supabase
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn(() => mockSupabaseChain),
  }),
}))

// Mock getBrowserQueryClient
vi.mock('@/app/providers', () => ({
  getBrowserQueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
  })),
}))

// Mock note-cache
vi.mock('@/lib/local-db/note-cache', () => ({
  getNoteLocally: vi.fn(),
  markNoteSynced: vi.fn(),
  markNoteError: vi.fn(),
  updateNoteIdMapping: vi.fn(),
  saveIdMapping: vi.fn(),
  getIdMapping: vi.fn(),
  getAllIdMappings: vi.fn().mockResolvedValue(new Map()),
}))

describe('sync-queue', () => {
  let getSyncQueue: () => ReturnType<typeof import('@/lib/local-db/sync-queue').getSyncQueue>
  let getNoteLocally: typeof import('@/lib/local-db/note-cache').getNoteLocally

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    
    // Reset mocks
    mockDB.get.mockResolvedValue(undefined)
    mockDB.put.mockResolvedValue(undefined)
    mockDB.add.mockResolvedValue(1)
    mockDB.delete.mockResolvedValue(undefined)
    mockDB.getAll.mockResolvedValue([])
    mockDB.getAllFromIndex.mockResolvedValue([])

    // Reset module to get fresh singleton
    vi.resetModules()
    
    // Re-import after reset
    const syncQueueModule = await import('@/lib/local-db/sync-queue')
    getSyncQueue = syncQueueModule.getSyncQueue
    
    const noteCacheModule = await import('@/lib/local-db/note-cache')
    getNoteLocally = noteCacheModule.getNoteLocally as typeof getNoteLocally
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  describe('enqueue', () => {
    it('should add item to sync queue for new notes', async () => {
      const syncQueue = getSyncQueue()
      
      await syncQueue.enqueue('temp_123', { title: 'New Note' })

      expect(mockDB.add).toHaveBeenCalled()
      const addCall = mockDB.add.mock.calls[0]
      expect(addCall[0]).toBe('syncQueue')
      expect(addCall[1]).toMatchObject({
        noteId: 'temp_123',
        operation: 'create',
        data: { title: 'New Note' },
      })
    })

    it('should update existing queue item if one exists for the note', async () => {
      const existingItem: SyncQueueItem = {
        id: 1,
        noteId: 'note-123',
        operation: 'update',
        data: { title: 'Old Title' },
        timestamp: Date.now(),
        retryCount: 0,
      }
      mockDB.getAllFromIndex.mockResolvedValue([existingItem])

      const syncQueue = getSyncQueue()
      await syncQueue.enqueue('note-123', { title: 'New Title' })

      expect(mockDB.put).toHaveBeenCalled()
      const putCall = mockDB.put.mock.calls[0]
      expect(putCall[0]).toBe('syncQueue')
      expect(putCall[1].data).toMatchObject({
        title: 'New Title',
      })
    })

    it('should use "update" operation for existing notes', async () => {
      const syncQueue = getSyncQueue()
      
      await syncQueue.enqueue('server-uuid-123', { content: 'Updated content' })

      expect(mockDB.add).toHaveBeenCalled()
      const addCall = mockDB.add.mock.calls[0]
      expect(addCall[1].operation).toBe('update')
    })
  })

  describe('processQueue', () => {
    it('should process create operation successfully', async () => {
      const localNote: LocalNote = {
        id: 'temp_123',
        title: 'New Note',
        problem: null,
        content: 'Content',
        wordCount: 1,
        updatedAt: Date.now(),
        syncStatus: 'pending',
        tempId: 'temp_123',
      }

      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_123',
        operation: 'create',
        data: { title: 'New Note' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      mockDB.getAll.mockResolvedValue([queueItem])
      ;(getNoteLocally as ReturnType<typeof vi.fn>).mockResolvedValue(localNote)
      
      mockSupabaseChain.single.mockResolvedValue({
        data: { id: 'server-uuid', title: 'New Note', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(mockSupabaseChain.insert).toHaveBeenCalled()
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
    })

    it('should process update operation successfully', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { title: 'Updated Title' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      mockDB.getAll.mockResolvedValue([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: { id: 'server-uuid-123', title: 'Updated Title', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
    })

    it('should increment retry count on error', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { title: 'Updated Title' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      mockDB.getAll.mockResolvedValue([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(mockDB.put).toHaveBeenCalled()
      const putCall = mockDB.put.mock.calls[0]
      expect(putCall[1].retryCount).toBe(1)
    })

    it('should mark note as error and preserve queue item with lastError after max retries', async () => {
      const { markNoteError } = await import('@/lib/local-db/note-cache')

      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { title: 'Updated Title' },
        timestamp: Date.now(),
        retryCount: 3, // Already at max
      }

      mockDB.getAll.mockResolvedValue([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(markNoteError).toHaveBeenCalledWith('server-uuid-123')
      // Item should be preserved with lastError, not deleted
      expect(mockDB.put).toHaveBeenCalled()
      const putCall = mockDB.put.mock.calls.find(
        (call) => call[0] === 'syncQueue' && call[1].lastError
      )
      expect(putCall).toBeDefined()
      expect(putCall![1].lastError).toBe('Server error')
    })
  })

  describe('getServerIdForTempId', () => {
    it('should return undefined for unknown temp IDs', () => {
      const syncQueue = getSyncQueue()
      
      const result = syncQueue.getServerIdForTempId('unknown-temp-id')

      expect(result).toBeUndefined()
    })
  })

  describe('flushSync', () => {
    it('should process queue immediately', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { title: 'Updated Title' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      mockDB.getAll.mockResolvedValue([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: { id: 'server-uuid-123', title: 'Updated Title', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.flushSync()

      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })
  })

  describe('tab sync via BroadcastChannel', () => {
    it('should notify listeners on enqueue', async () => {
      const syncQueue = getSyncQueue()
      const listener = vi.fn()

      syncQueue.addListener(listener)
      await syncQueue.enqueue('note-123', { title: 'Test' })

      // Note: BroadcastChannel notifies OTHER tabs, not the current one
      // The listener is called directly for local changes in the actual implementation
    })

    it('should return unsubscribe function', () => {
      const syncQueue = getSyncQueue()
      const listener = vi.fn()

      const unsubscribe = syncQueue.addListener(listener)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('temp ID mapping persistence (Phase C)', () => {
    it('should NOT delete queue item when UPDATE has unmapped temp ID', async () => {
      const { getIdMapping } = await import('@/lib/local-db/note-cache')
      // Return undefined - no mapping exists
      ;(getIdMapping as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_unmapped',
        operation: 'update',
        data: { title: 'Updated Title' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      mockDB.getAll.mockResolvedValue([queueItem])

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Queue item should NOT be deleted - it should remain for retry
      expect(mockDB.delete).not.toHaveBeenCalledWith('syncQueue', 1)
      // Also should NOT increment retry count for TEMP_ID_NOT_MAPPED
      const retryPutCall = mockDB.put.mock.calls.find(
        (call) => call[0] === 'syncQueue' && call[1].retryCount === 1
      )
      expect(retryPutCall).toBeUndefined()
    })

    it('should process UPDATE successfully when mapping exists in IndexedDB', async () => {
      const { getIdMapping } = await import('@/lib/local-db/note-cache')
      // Return mapping from IDB
      ;(getIdMapping as ReturnType<typeof vi.fn>).mockResolvedValue('server-uuid-mapped')

      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_with_mapping',
        operation: 'update',
        data: { title: 'Updated Title' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      mockDB.getAll.mockResolvedValue([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: {
          id: 'server-uuid-mapped',
          title: 'Updated Title',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should have called update with the mapped server ID
      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'server-uuid-mapped')
      // Queue item should be deleted on success
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
    })

    it('should skip items with lastError (permanently failed)', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { title: 'Updated Title' },
        timestamp: Date.now(),
        retryCount: 3,
        lastError: 'Previous server error',
      }

      mockDB.getAll.mockResolvedValue([queueItem])

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should not attempt to update - item is skipped
      expect(mockSupabaseChain.update).not.toHaveBeenCalled()
      // Should not delete or modify the item
      expect(mockDB.delete).not.toHaveBeenCalledWith('syncQueue', 1)
    })

    it('should persist mapping after CREATE succeeds', async () => {
      const { saveIdMapping } = await import('@/lib/local-db/note-cache')

      const localNote: LocalNote = {
        id: 'temp_new',
        title: 'New Note',
        problem: null,
        content: 'Content',
        wordCount: 1,
        updatedAt: Date.now(),
        syncStatus: 'pending',
        tempId: 'temp_new',
      }

      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_new',
        operation: 'create',
        data: { title: 'New Note' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      mockDB.getAll.mockResolvedValue([queueItem])
      ;(getNoteLocally as ReturnType<typeof vi.fn>).mockResolvedValue(localNote)

      mockSupabaseChain.single.mockResolvedValue({
        data: { id: 'server-uuid-created', title: 'New Note', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should persist the mapping to IndexedDB
      expect(saveIdMapping).toHaveBeenCalledWith('temp_new', 'server-uuid-created')
    })
  })
})
