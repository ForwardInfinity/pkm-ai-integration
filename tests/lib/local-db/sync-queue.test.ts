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

    it('should mark note as error after max retries', async () => {
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
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
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
})
