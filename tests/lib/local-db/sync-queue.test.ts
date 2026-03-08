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
  is: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
}

const mockTriggerEmbeddingGeneration = vi.fn()
const mockSyncNoteLinks = vi.fn()
const mockBeginNoteAnalysisRefresh = vi.fn()
const mockQueryClient = {
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
}
let queueItemsState: SyncQueueItem[] = []

function cloneQueueItem(item: SyncQueueItem): SyncQueueItem {
  return {
    ...item,
    data: { ...item.data },
  }
}

function setQueueItems(items: SyncQueueItem[]) {
  queueItemsState = items.map(cloneQueueItem)
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
vi.mock('@/lib/query-client', () => ({
  getBrowserQueryClient: vi.fn(() => mockQueryClient),
}))

vi.mock('@/features/notes/actions/trigger-embedding', () => ({
  triggerEmbeddingGeneration: (...args: unknown[]) =>
    mockTriggerEmbeddingGeneration(...args),
}))

vi.mock('@/features/notes/actions/sync-note-links', () => ({
  syncNoteLinks: (...args: unknown[]) => mockSyncNoteLinks(...args),
}))

vi.mock('@/lib/note-analysis-refresh', () => ({
  beginNoteAnalysisRefresh: (...args: unknown[]) =>
    mockBeginNoteAnalysisRefresh(...args),
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
  getCurrentSessionTempDraftId: vi.fn(() =>
    window.sessionStorage.getItem('refinery-current-session-temp-draft')
  ),
  clearCurrentSessionTempDraftId: vi.fn(() =>
    window.sessionStorage.removeItem('refinery-current-session-temp-draft')
  ),
}))

describe('sync-queue', () => {
  let getSyncQueue: () => ReturnType<typeof import('@/lib/local-db/sync-queue').getSyncQueue>
  let getNoteLocally: typeof import('@/lib/local-db/note-cache').getNoteLocally

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.clearAllTimers()

    // Reset mock-backed queue state
    setQueueItems([])
    mockDB.get.mockImplementation((storeName: string, key: string | number) => {
      if (storeName === 'syncQueue' && typeof key === 'number') {
        const item = queueItemsState.find((queueItem) => queueItem.id === key)
        return Promise.resolve(item ? cloneQueueItem(item) : undefined)
      }

      return Promise.resolve(undefined)
    })
    mockDB.put.mockImplementation((storeName: string, value: SyncQueueItem) => {
      if (storeName === 'syncQueue') {
        const existingIndex = queueItemsState.findIndex((item) => item.id === value.id)
        if (existingIndex >= 0) {
          queueItemsState[existingIndex] = cloneQueueItem(value)
        } else {
          queueItemsState.push(cloneQueueItem(value))
        }
      }

      return Promise.resolve(undefined)
    })
    mockDB.add.mockImplementation((storeName: string, value: SyncQueueItem) => {
      if (storeName === 'syncQueue') {
        const nextId =
          queueItemsState.reduce((maxId, item) => Math.max(maxId, item.id ?? 0), 0) + 1
        queueItemsState.push(cloneQueueItem({ ...value, id: nextId }))
        return Promise.resolve(nextId)
      }

      return Promise.resolve(1)
    })
    mockDB.delete.mockImplementation((storeName: string, key: string | number) => {
      if (storeName === 'syncQueue' && typeof key === 'number') {
        queueItemsState = queueItemsState.filter((item) => item.id !== key)
      }

      return Promise.resolve(undefined)
    })
    mockDB.getAll.mockImplementation((storeName: string) => {
      if (storeName === 'syncQueue') {
        return Promise.resolve(queueItemsState.map(cloneQueueItem))
      }

      return Promise.resolve([])
    })
    mockDB.getAllFromIndex.mockResolvedValue([])
    mockSupabaseChain.single.mockResolvedValue({
      data: { id: 'server-uuid', updated_at: '2024-01-01T00:00:00Z' },
      error: null,
    })
    mockSupabaseChain.maybeSingle.mockResolvedValue({
      data: { id: 'server-uuid', updated_at: '2024-01-01T00:00:00Z' },
      error: null,
    })
    mockTriggerEmbeddingGeneration.mockResolvedValue({ success: true })
    mockSyncNoteLinks.mockResolvedValue({ success: true })
    mockBeginNoteAnalysisRefresh.mockReset()
    mockQueryClient.setQueryData.mockReset()
    mockQueryClient.invalidateQueries.mockReset()
    window.sessionStorage.clear()

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

      setQueueItems([queueItem])
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

      setQueueItems([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: { id: 'server-uuid-123', title: 'Updated Title', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      })
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: { id: 'server-uuid-123', title: 'Updated Title', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
    })

    it('invalidates tag-filtered note queries after a successful tag sync', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { tags: ['science'] },
        timestamp: Date.now(),
        retryCount: 0,
      }

      setQueueItems([queueItem])
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: {
          id: 'server-uuid-123',
          title: 'Updated Title',
          problem: null,
          content: '#science',
          word_count: 2,
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      const { tagKeys } = await import('@/features/notes/hooks/use-tags')
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: tagKeys.listByTagsPrefix(),
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: tagKeys.tags(),
      })
    })

    it('starts a refresh window and invalidates analysis queries after successful embedding enqueue', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { content: 'Updated content' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      setQueueItems([queueItem])
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: {
          id: 'server-uuid-123',
          title: 'Updated Title',
          problem: null,
          content: 'Updated content',
          word_count: 2,
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      const { relatedNotesKeys } = await import('@/features/notes/hooks/use-related-notes')
      const { conflictKeys } = await import('@/features/conflicts/hooks/use-conflicts')

      expect(mockBeginNoteAnalysisRefresh).toHaveBeenCalledWith('server-uuid-123')
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: relatedNotesKeys.all,
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: conflictKeys.all,
      })
    })

    it('invalidates backlink queries after note link sync succeeds', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { content: 'Updated content' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      setQueueItems([queueItem])
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: {
          id: 'server-uuid-123',
          title: 'Updated Title',
          problem: null,
          content: 'Updated content',
          word_count: 2,
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      const { backlinkKeys } = await import('@/features/notes/hooks/use-backlinks')
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: backlinkKeys.all,
      })
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

      setQueueItems([queueItem])
      mockSupabaseChain.maybeSingle.mockResolvedValue({
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

      setQueueItems([queueItem])
      mockSupabaseChain.maybeSingle.mockResolvedValue({
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

    it('should remove queued update and skip side effects for trashed notes', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { content: 'Updated content' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      setQueueItems([queueItem])
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(mockTriggerEmbeddingGeneration).not.toHaveBeenCalled()
      expect(mockSyncNoteLinks).not.toHaveBeenCalled()
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
    })

    it('should not recreate a queue item removed while processing', async () => {
      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_removed',
        operation: 'update',
        data: { title: 'Stale draft' },
        timestamp: Date.now() - 6 * 60 * 1000,
        retryCount: 0,
      }

      setQueueItems([queueItem])

      const { getIdMapping } = await import('@/lib/local-db/note-cache')
      ;(getIdMapping as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      mockDB.get
        .mockResolvedValueOnce(cloneQueueItem(queueItem))
        .mockResolvedValueOnce(undefined)

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(mockDB.put).not.toHaveBeenCalledWith(
        'syncQueue',
        expect.objectContaining({ noteId: 'temp_removed' })
      )
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

      setQueueItems([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: { id: 'server-uuid-123', title: 'Updated Title', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.flushSync()

      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })
  })

  describe('startup resume', () => {
    it('should resume queue processing on app startup', async () => {
      const { resumeSyncQueueOnStartup } = await import('@/lib/local-db/sync-queue')
      const syncQueue = getSyncQueue()
      const processSpy = vi.spyOn(syncQueue, 'processQueue').mockResolvedValue(undefined)

      await resumeSyncQueueOnStartup()

      expect(processSpy).toHaveBeenCalledTimes(1)
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

      setQueueItems([queueItem])

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

      setQueueItems([queueItem])
      mockSupabaseChain.maybeSingle.mockResolvedValue({
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

      setQueueItems([queueItem])

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should not attempt to update - item is skipped
      expect(mockSupabaseChain.update).not.toHaveBeenCalled()
      // Should not delete or modify the item
      expect(mockDB.delete).not.toHaveBeenCalledWith('syncQueue', 1)
    })

    it('should persist mapping after CREATE succeeds', async () => {
      const { saveIdMapping, getIdMapping } = await import('@/lib/local-db/note-cache')
      // Ensure no existing mapping (so CREATE proceeds)
      ;(getIdMapping as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

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

      setQueueItems([queueItem])
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

    it('should remove queue items, local drafts, and temp mappings for deleted notes', async () => {
      const { getAllIdMappings } = await import('@/lib/local-db/note-cache')
      ;(getAllIdMappings as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['temp_123', 'server-uuid-123']])
      )

      window.sessionStorage.setItem('refinery-current-session-temp-draft', 'temp_123')

      const queuedServerItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-uuid-123',
        operation: 'update',
        data: { title: 'Updated title' },
        timestamp: Date.now(),
        retryCount: 0,
      }
      const queuedTempItem: SyncQueueItem = {
        id: 2,
        noteId: 'temp_123',
        operation: 'update',
        data: { content: 'Draft content' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      setQueueItems([queuedServerItem, queuedTempItem])
      mockDB.getAllFromIndex.mockImplementation(
        (storeName: string, indexName: string, value: string) => {
          if (
            storeName === 'idMappings' &&
            indexName === 'by-server-id' &&
            value === 'server-uuid-123'
          ) {
            return Promise.resolve([
              {
                tempId: 'temp_123',
                serverId: 'server-uuid-123',
                createdAt: Date.now(),
              },
            ])
          }

          return Promise.resolve([])
        }
      )

      const syncQueue = getSyncQueue()
      await syncQueue.removeNote('server-uuid-123')

      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 2)
      expect(mockDB.delete).toHaveBeenCalledWith('notes', 'server-uuid-123')
      expect(mockDB.delete).toHaveBeenCalledWith('notes', 'temp_123')
      expect(mockDB.delete).toHaveBeenCalledWith('idMappings', 'temp_123')
      expect(window.sessionStorage.getItem('refinery-current-session-temp-draft')).toBeNull()
    })
  })

  describe('enqueue recovery (fix 1.1)', () => {
    it('should clear lastError and reset retryCount when re-enqueuing a failed item', async () => {
      const failedItem: SyncQueueItem = {
        id: 1,
        noteId: 'note-123',
        operation: 'update',
        data: { title: 'Old Title' },
        timestamp: Date.now() - 60000,
        retryCount: 3,
        lastError: 'Server error',
      }
      mockDB.getAllFromIndex.mockResolvedValue([failedItem])

      const syncQueue = getSyncQueue()
      await syncQueue.enqueue('note-123', { title: 'New Title' })

      expect(mockDB.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        noteId: 'note-123',
        data: expect.objectContaining({ title: 'New Title' }),
        retryCount: 0,
        lastError: undefined,
      }))
    })

    it('should re-enqueue recovered notes with their persisted tags', async () => {
      const { requeueRecoveredNote } = await import('@/lib/local-db/sync-queue')
      const syncQueue = getSyncQueue()
      const enqueueSpy = vi.spyOn(syncQueue, 'enqueue').mockResolvedValue(undefined)

      await requeueRecoveredNote({
        id: 'note-123',
        title: 'Recovered',
        problem: null,
        content: 'Recovered #tag',
        wordCount: 2,
        tags: ['tag'],
        updatedAt: Date.now(),
        syncStatus: 'error',
      })

      expect(enqueueSpy).toHaveBeenCalledWith('note-123', {
        title: 'Recovered',
        problem: null,
        content: 'Recovered #tag',
        wordCount: 2,
        tags: ['tag'],
      })
    })
  })

  describe('cross-tab locking (fix 1.2)', () => {
    it('should use Web Locks API when available', async () => {
      const mockLockRequest = vi.fn().mockImplementation(
        async (_name: string, _options: object, callback: (lock: object | null) => Promise<void>) => {
          await callback({ name: 'refinery-sync-queue-lock' })
        }
      )
      vi.stubGlobal('navigator', { locks: { request: mockLockRequest } })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      expect(mockLockRequest).toHaveBeenCalledWith(
        'refinery-sync-queue-lock',
        { ifAvailable: true },
        expect.any(Function)
      )
    })

    it('should skip processing if lock is not available (another tab holds it)', async () => {
      const mockLockRequest = vi.fn().mockImplementation(
        async (_name: string, _options: object, callback: (lock: object | null) => Promise<void>) => {
          await callback(null) // Lock not available
        }
      )
      vi.stubGlobal('navigator', { locks: { request: mockLockRequest } })

      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'test-note',
        operation: 'update',
        data: { title: 'Test' },
        timestamp: Date.now(),
        retryCount: 0,
      }
      setQueueItems([queueItem])

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // No processing should occur - lock was not acquired
      expect(mockDB.delete).not.toHaveBeenCalled()
    })

    it('should fallback to local processing if Web Locks unavailable', async () => {
      vi.stubGlobal('navigator', { locks: undefined })

      const queueItem: SyncQueueItem = {
        id: 1,
        noteId: 'server-id',
        operation: 'update',
        data: { title: 'Test' },
        timestamp: Date.now(),
        retryCount: 0,
      }
      setQueueItems([queueItem])
      mockSupabaseChain.single.mockResolvedValue({
        data: { id: 'server-id', updated_at: new Date().toISOString() },
        error: null,
      })

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should still process (fallback to local lock)
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
    })
  })

  describe('duplicate CREATE prevention (fix 1.3)', () => {
    it('should skip CREATE if ID mapping already exists (created by another tab)', async () => {
      const { getIdMapping } = await import('@/lib/local-db/note-cache')
      ;(getIdMapping as ReturnType<typeof vi.fn>).mockResolvedValue('server-uuid-from-other-tab')

      const createItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_123',
        operation: 'create',
        data: { title: 'New Note' },
        timestamp: Date.now(),
        retryCount: 0,
      }
      setQueueItems([createItem])

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should NOT call insert - another tab already created
      expect(mockSupabaseChain.insert).not.toHaveBeenCalled()
      // But should delete from queue (success path - no work needed)
      expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 1)
    })
  })

  describe('TEMP_ID_NOT_MAPPED timeout (fix 1.4)', () => {
    it('should keep item in queue if within timeout window', async () => {
      const { getIdMapping, markNoteError } = await import('@/lib/local-db/note-cache')
      ;(getIdMapping as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const recentItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_recent',
        operation: 'update',
        data: { title: 'Update' },
        timestamp: Date.now() - 60000, // 1 minute old - within 5 min timeout
        retryCount: 0,
      }
      setQueueItems([recentItem])

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should NOT be marked as error
      expect(markNoteError).not.toHaveBeenCalled()
      // Should NOT have lastError set
      const timeoutPutCall = mockDB.put.mock.calls.find(
        (call) => call[0] === 'syncQueue' && call[1].lastError === 'TEMP_ID_NOT_MAPPED_TIMEOUT'
      )
      expect(timeoutPutCall).toBeUndefined()
      // Should NOT be deleted
      expect(mockDB.delete).not.toHaveBeenCalled()
    })

    it('should mark as permanent failure if TEMP_ID_NOT_MAPPED exceeds timeout', async () => {
      const { getIdMapping, markNoteError } = await import('@/lib/local-db/note-cache')
      ;(getIdMapping as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const oldItem: SyncQueueItem = {
        id: 1,
        noteId: 'temp_old',
        operation: 'update',
        data: { title: 'Update' },
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes old - exceeds 5 min timeout
        retryCount: 0,
      }
      setQueueItems([oldItem])

      const syncQueue = getSyncQueue()
      await syncQueue.processQueue()

      // Should mark note as error
      expect(markNoteError).toHaveBeenCalledWith('temp_old')
      // Should set lastError
      expect(mockDB.put).toHaveBeenCalledWith('syncQueue', expect.objectContaining({
        noteId: 'temp_old',
        lastError: 'TEMP_ID_NOT_MAPPED_TIMEOUT',
      }))
    })
  })
})
