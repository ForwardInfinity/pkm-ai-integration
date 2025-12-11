import { describe, it, expect, beforeEach } from 'vitest'
import { useNoteEditorStore } from '@/stores/note-editor-store'
import type { Note } from '@/features/notes/types'

describe('note-editor-store', () => {
  const mockNote: Note = {
    id: 'test-note-id',
    user_id: 'user-123',
    title: 'Test Note',
    problem: 'Test problem',
    content: 'Test content',
    tags: ['tag1', 'tag2'],
    is_pinned: false,
    word_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
    embedding: null,
    fts: null,
  }

  beforeEach(() => {
    // Reset store to initial state
    useNoteEditorStore.getState().reset()
  })

  describe('setCurrentNote', () => {
    it('should set the current note', () => {
      const store = useNoteEditorStore.getState()
      
      store.setCurrentNote(mockNote)

      expect(useNoteEditorStore.getState().currentNote).toEqual(mockNote)
    })

    it('should also set currentNoteId when setting note', () => {
      const store = useNoteEditorStore.getState()
      
      store.setCurrentNote(mockNote)

      expect(useNoteEditorStore.getState().currentNoteId).toBe(mockNote.id)
    })

    it('should clear currentNoteId when setting note to null', () => {
      const store = useNoteEditorStore.getState()
      store.setCurrentNote(mockNote)
      
      store.setCurrentNote(null)

      expect(useNoteEditorStore.getState().currentNote).toBeNull()
      expect(useNoteEditorStore.getState().currentNoteId).toBeNull()
    })
  })

  describe('setCurrentNoteId', () => {
    it('should set the current note ID', () => {
      const store = useNoteEditorStore.getState()
      
      store.setCurrentNoteId('note-123')

      expect(useNoteEditorStore.getState().currentNoteId).toBe('note-123')
    })

    it('should clear the ID when set to null', () => {
      const store = useNoteEditorStore.getState()
      store.setCurrentNoteId('note-123')
      
      store.setCurrentNoteId(null)

      expect(useNoteEditorStore.getState().currentNoteId).toBeNull()
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const store = useNoteEditorStore.getState()
      store.setCurrentNote(mockNote)
      store.setCurrentNoteId('custom-id')

      store.reset()

      const state = useNoteEditorStore.getState()
      expect(state.currentNote).toBeNull()
      expect(state.currentNoteId).toBeNull()
    })
  })

  describe('selector hooks', () => {
    it('should return current note via useCurrentNote', () => {
      const store = useNoteEditorStore.getState()
      store.setCurrentNote(mockNote)

      // Direct state access (simulating hook behavior)
      const currentNote = useNoteEditorStore.getState().currentNote
      expect(currentNote).toEqual(mockNote)
    })

    it('should return current note ID via useCurrentNoteId', () => {
      const store = useNoteEditorStore.getState()
      store.setCurrentNoteId('test-id')

      const currentNoteId = useNoteEditorStore.getState().currentNoteId
      expect(currentNoteId).toBe('test-id')
    })
  })
})
