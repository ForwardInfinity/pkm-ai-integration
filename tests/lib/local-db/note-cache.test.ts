import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { LocalNote } from '@/lib/local-db'

// Mock transaction store
const mockStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

const mockTx = {
  objectStore: vi.fn(() => mockStore),
  done: Promise.resolve(),
}

// Mock the idb module
const mockDB = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getAllFromIndex: vi.fn(),
  transaction: vi.fn(() => mockTx),
  close: vi.fn(),
}

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}))

// Import after mocking
import {
  setActiveLocalDbUser,
} from '@/lib/local-db'

import {
  saveNoteLocally,
  mergeNoteLocally,
  getNoteLocally,
  deleteNoteLocally,
  getPendingNotes,
  getErrorNotes,
  markNoteSynced,
  markNoteError,
  markNoteConflict,
  updateNoteIdMapping,
  getAllLocalNotes,
  saveIdMapping,
  getIdMapping,
  getAllIdMappings,
  getCurrentSessionTempDraftId,
  setCurrentSessionTempDraftId,
  clearCurrentSessionTempDraftId,
} from '@/lib/local-db/note-cache'

describe('note-cache', () => {
  const mockNote: LocalNote = {
    id: 'note-123',
    title: 'Test Note',
    problem: 'Test problem',
    content: 'Test content',
    wordCount: 10,
    tags: ['test-tag'],
    updatedAt: Date.now(),
    syncStatus: 'pending',
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await setActiveLocalDbUser(null)
    await setActiveLocalDbUser('test-user-id')
    mockDB.get.mockResolvedValue(undefined)
    mockDB.put.mockResolvedValue(undefined)
    mockDB.delete.mockResolvedValue(undefined)
    mockDB.getAll.mockResolvedValue([])
    mockDB.getAllFromIndex.mockResolvedValue([])
    // Reset transaction mocks
    mockStore.get.mockResolvedValue(undefined)
    mockStore.put.mockResolvedValue(undefined)
    mockStore.delete.mockResolvedValue(undefined)
    mockTx.objectStore.mockReturnValue(mockStore)
    mockTx.done = Promise.resolve()
  })

  describe('saveNoteLocally', () => {
    it('should save a note to IndexedDB', async () => {
      await saveNoteLocally(mockNote)

      expect(mockDB.transaction).toHaveBeenCalledWith('notes', 'readwrite')
      expect(mockStore.put).toHaveBeenCalledWith(mockNote)
    })

    it('should persist tags on the local note payload', async () => {
      await saveNoteLocally(mockNote)

      expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
        id: 'note-123',
        tags: ['test-tag'],
      }))
    })
  })

  describe('mergeNoteLocally', () => {
    it('should seed the first persisted draft from the server snapshot', async () => {
      const result = await mergeNoteLocally(
        'note-123',
        { title: 'Recovered title' },
        {
          seed: {
            title: 'Server title',
            problem: 'Server problem',
            content: 'Server content',
            wordCount: 2,
            tags: ['server-tag'],
            serverVersion: '2024-01-01T00:00:00Z',
          },
        }
      )

      expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
        id: 'note-123',
        title: 'Recovered title',
        problem: 'Server problem',
        content: 'Server content',
        wordCount: 2,
        tags: ['server-tag'],
        syncStatus: 'pending',
        serverVersion: '2024-01-01T00:00:00Z',
      }))
      expect(result).toMatchObject({
        id: 'note-123',
        title: 'Recovered title',
        content: 'Server content',
        serverVersion: '2024-01-01T00:00:00Z',
      })
    })

    it('serializes overlapping saves for the same note', async () => {
      const persistedNotes = new Map<string, LocalNote>()
      let releaseFirstGet: (() => void) | null = null
      const firstGet = new Promise<void>((resolve) => {
        releaseFirstGet = resolve
      })
      let getCalls = 0

      mockStore.get.mockImplementation(async (id: string) => {
        getCalls += 1
        if (getCalls === 1) {
          await firstGet
        }

        return persistedNotes.get(id)
      })
      mockStore.put.mockImplementation(async (note: LocalNote) => {
        persistedNotes.set(note.id, note)
      })

      const seed = {
        title: 'Server title',
        problem: null,
        content: 'Server content',
        wordCount: 2,
        tags: ['seed-tag'],
        serverVersion: '2024-01-01T00:00:00Z',
      }

      const firstSave = mergeNoteLocally(
        'note-123',
        { title: 'Updated title' },
        { seed }
      )
      const secondSave = mergeNoteLocally(
        'note-123',
        { content: 'Updated content' },
        { seed }
      )

      await Promise.resolve()
      releaseFirstGet?.()
      await Promise.all([firstSave, secondSave])

      expect(persistedNotes.get('note-123')).toMatchObject({
        id: 'note-123',
        title: 'Updated title',
        content: 'Updated content',
        problem: null,
        tags: ['seed-tag'],
        serverVersion: '2024-01-01T00:00:00Z',
      })
    })
  })

  describe('getNoteLocally', () => {
    it('should retrieve a note by ID', async () => {
      mockDB.get.mockResolvedValue(mockNote)

      const result = await getNoteLocally('note-123')

      expect(mockDB.get).toHaveBeenCalledWith('notes', 'note-123')
      expect(result).toEqual(mockNote)
    })

    it('should return undefined for non-existent note', async () => {
      mockDB.get.mockResolvedValue(undefined)

      const result = await getNoteLocally('non-existent')

      expect(result).toBeUndefined()
    })

    it('should recover tags from IndexedDB drafts', async () => {
      mockDB.get.mockResolvedValue(mockNote)

      const result = await getNoteLocally('note-123')

      expect(result?.tags).toEqual(['test-tag'])
    })
  })

  describe('deleteNoteLocally', () => {
    it('should delete a note by ID', async () => {
      await deleteNoteLocally('note-123')

      expect(mockDB.delete).toHaveBeenCalledWith('notes', 'note-123')
    })
  })

  describe('getPendingNotes', () => {
    it('should return notes with pending sync status', async () => {
      const pendingNotes = [mockNote]
      mockDB.getAllFromIndex.mockResolvedValue(pendingNotes)

      const result = await getPendingNotes()

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('notes', 'by-sync-status', 'pending')
      expect(result).toEqual(pendingNotes)
    })
  })

  describe('getErrorNotes', () => {
    it('should return notes with error sync status', async () => {
      const errorNote = { ...mockNote, syncStatus: 'error' as const }
      mockDB.getAllFromIndex.mockResolvedValue([errorNote])

      const result = await getErrorNotes()

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('notes', 'by-sync-status', 'error')
      expect(result).toEqual([errorNote])
    })
  })

  describe('markNoteSynced', () => {
    it('should update sync status to synced', async () => {
      mockStore.get.mockResolvedValue(mockNote)

      await markNoteSynced('note-123', '2024-01-01T00:00:00Z')

      expect(mockStore.get).toHaveBeenCalledWith('note-123')
      expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
        ...mockNote,
        syncStatus: 'synced',
        serverVersion: '2024-01-01T00:00:00Z',
      }))
    })

    it('should do nothing if note does not exist', async () => {
      mockStore.get.mockResolvedValue(undefined)

      await markNoteSynced('non-existent', '2024-01-01T00:00:00Z')

      expect(mockStore.put).not.toHaveBeenCalled()
    })
  })

  describe('markNoteError', () => {
    it('should update sync status to error', async () => {
      mockStore.get.mockResolvedValue(mockNote)

      await markNoteError('note-123')

      expect(mockStore.get).toHaveBeenCalledWith('note-123')
      expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
        ...mockNote,
        syncStatus: 'error',
      }))
    })

    it('should do nothing if note does not exist', async () => {
      mockStore.get.mockResolvedValue(undefined)

      await markNoteError('non-existent')

      expect(mockStore.put).not.toHaveBeenCalled()
    })
  })

  describe('markNoteConflict', () => {
    it('should persist version-conflict metadata on the local note', async () => {
      mockStore.get.mockResolvedValue(mockNote)

      await markNoteConflict('note-123', {
        serverVersion: '2024-01-02T00:00:00Z',
        message: 'This local draft could not sync because the note changed elsewhere.',
      })

      expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
        ...mockNote,
        syncStatus: 'error',
        syncError: 'version-conflict',
        syncErrorMessage:
          'This local draft could not sync because the note changed elsewhere.',
        latestServerVersion: '2024-01-02T00:00:00Z',
      }))
    })
  })

  describe('updateNoteIdMapping', () => {
    it('should migrate note from temp ID to server ID using atomic transaction', async () => {
      const tempNote = { ...mockNote, id: 'temp_123', tempId: 'temp_123' }
      mockStore.get.mockResolvedValue(tempNote)

      await updateNoteIdMapping('temp_123', 'server-uuid')

      // Verify transaction was used for atomic operation
      expect(mockDB.transaction).toHaveBeenCalledWith('notes', 'readwrite')
      expect(mockTx.objectStore).toHaveBeenCalledWith('notes')
      expect(mockStore.delete).toHaveBeenCalledWith('temp_123')
      expect(mockStore.put).toHaveBeenCalledWith({
        ...tempNote,
        id: 'server-uuid',
        tempId: undefined,
      })
    })

    it('should do nothing if temp note does not exist', async () => {
      mockStore.get.mockResolvedValue(undefined)

      await updateNoteIdMapping('non-existent', 'server-uuid')

      expect(mockDB.transaction).toHaveBeenCalledWith('notes', 'readwrite')
      expect(mockStore.delete).not.toHaveBeenCalled()
      expect(mockStore.put).not.toHaveBeenCalled()
    })
  })

  describe('getAllLocalNotes', () => {
    it('should return all notes from IndexedDB', async () => {
      const notes = [mockNote, { ...mockNote, id: 'note-456' }]
      mockDB.getAll.mockResolvedValue(notes)

      const result = await getAllLocalNotes()

      expect(mockDB.getAll).toHaveBeenCalledWith('notes')
      expect(result).toEqual(notes)
    })

    it('should return empty array when no notes', async () => {
      mockDB.getAll.mockResolvedValue([])

      const result = await getAllLocalNotes()

      expect(result).toEqual([])
    })
  })

  describe('ID Mapping helpers (Phase C)', () => {
    describe('saveIdMapping', () => {
      it('should save temp→server ID mapping to idMappings store', async () => {
        await saveIdMapping('temp_123', 'server-uuid')

        expect(mockDB.put).toHaveBeenCalledWith('idMappings', {
          tempId: 'temp_123',
          serverId: 'server-uuid',
          createdAt: expect.any(Number),
        })
      })
    })

    describe('getIdMapping', () => {
      it('should return server ID for existing temp ID', async () => {
        mockDB.get.mockResolvedValue({
          tempId: 'temp_123',
          serverId: 'server-uuid',
          createdAt: Date.now(),
        })

        const result = await getIdMapping('temp_123')

        expect(mockDB.get).toHaveBeenCalledWith('idMappings', 'temp_123')
        expect(result).toBe('server-uuid')
      })

      it('should return undefined for non-existent temp ID', async () => {
        mockDB.get.mockResolvedValue(undefined)

        const result = await getIdMapping('non-existent')

        expect(result).toBeUndefined()
      })
    })

    describe('getAllIdMappings', () => {
      it('should return all mappings as a Map', async () => {
        mockDB.getAll.mockResolvedValue([
          { tempId: 'temp_1', serverId: 'server-a', createdAt: Date.now() },
          { tempId: 'temp_2', serverId: 'server-b', createdAt: Date.now() },
        ])

        const result = await getAllIdMappings()

        expect(mockDB.getAll).toHaveBeenCalledWith('idMappings')
        expect(result).toBeInstanceOf(Map)
        expect(result.get('temp_1')).toBe('server-a')
        expect(result.get('temp_2')).toBe('server-b')
      })

      it('should return empty Map when no mappings exist', async () => {
        mockDB.getAll.mockResolvedValue([])

        const result = await getAllIdMappings()

        expect(result).toBeInstanceOf(Map)
        expect(result.size).toBe(0)
      })
    })
  })

  describe('session temp draft registry', () => {
    it('should persist the current session temp draft ID', () => {
      setCurrentSessionTempDraftId('temp_session_123')

      expect(getCurrentSessionTempDraftId()).toBe('temp_session_123')
    })

    it('should clear the current session temp draft ID', () => {
      setCurrentSessionTempDraftId('temp_session_123')

      clearCurrentSessionTempDraftId()

      expect(getCurrentSessionTempDraftId()).toBeNull()
    })
  })
})
