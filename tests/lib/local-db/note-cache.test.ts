import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { LocalNote } from '@/lib/local-db'

// Mock the idb module
const mockDB = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getAllFromIndex: vi.fn(),
}

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}))

// Import after mocking
import {
  saveNoteLocally,
  getNoteLocally,
  deleteNoteLocally,
  getPendingNotes,
  getErrorNotes,
  markNoteSynced,
  markNoteError,
  updateNoteIdMapping,
  getAllLocalNotes,
} from '@/lib/local-db/note-cache'

describe('note-cache', () => {
  const mockNote: LocalNote = {
    id: 'note-123',
    title: 'Test Note',
    problem: 'Test problem',
    content: 'Test content',
    wordCount: 10,
    updatedAt: Date.now(),
    syncStatus: 'pending',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDB.get.mockResolvedValue(undefined)
    mockDB.put.mockResolvedValue(undefined)
    mockDB.delete.mockResolvedValue(undefined)
    mockDB.getAll.mockResolvedValue([])
    mockDB.getAllFromIndex.mockResolvedValue([])
  })

  describe('saveNoteLocally', () => {
    it('should save a note to IndexedDB', async () => {
      await saveNoteLocally(mockNote)

      expect(mockDB.put).toHaveBeenCalledWith('notes', mockNote)
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
      mockDB.get.mockResolvedValue(mockNote)

      await markNoteSynced('note-123', '2024-01-01T00:00:00Z')

      expect(mockDB.get).toHaveBeenCalledWith('notes', 'note-123')
      expect(mockDB.put).toHaveBeenCalledWith('notes', {
        ...mockNote,
        syncStatus: 'synced',
        serverVersion: '2024-01-01T00:00:00Z',
      })
    })

    it('should do nothing if note does not exist', async () => {
      mockDB.get.mockResolvedValue(undefined)

      await markNoteSynced('non-existent', '2024-01-01T00:00:00Z')

      expect(mockDB.put).not.toHaveBeenCalled()
    })
  })

  describe('markNoteError', () => {
    it('should update sync status to error', async () => {
      mockDB.get.mockResolvedValue(mockNote)

      await markNoteError('note-123')

      expect(mockDB.get).toHaveBeenCalledWith('notes', 'note-123')
      expect(mockDB.put).toHaveBeenCalledWith('notes', {
        ...mockNote,
        syncStatus: 'error',
      })
    })

    it('should do nothing if note does not exist', async () => {
      mockDB.get.mockResolvedValue(undefined)

      await markNoteError('non-existent')

      expect(mockDB.put).not.toHaveBeenCalled()
    })
  })

  describe('updateNoteIdMapping', () => {
    it('should migrate note from temp ID to server ID', async () => {
      const tempNote = { ...mockNote, id: 'temp_123', tempId: 'temp_123' }
      mockDB.get.mockResolvedValue(tempNote)

      await updateNoteIdMapping('temp_123', 'server-uuid')

      expect(mockDB.delete).toHaveBeenCalledWith('notes', 'temp_123')
      expect(mockDB.put).toHaveBeenCalledWith('notes', {
        ...tempNote,
        id: 'server-uuid',
        tempId: undefined,
      })
    })

    it('should do nothing if temp note does not exist', async () => {
      mockDB.get.mockResolvedValue(undefined)

      await updateNoteIdMapping('non-existent', 'server-uuid')

      expect(mockDB.delete).not.toHaveBeenCalled()
      expect(mockDB.put).not.toHaveBeenCalled()
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
})
