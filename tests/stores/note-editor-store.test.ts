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
    useNoteEditorStore.getState().reset()
  })

  describe('hydrateFromServer', () => {
    it('hydrates the current draft from a server note', () => {
      const store = useNoteEditorStore.getState()

      store.hydrateFromServer(mockNote, 'tab-1')

      expect(useNoteEditorStore.getState()).toMatchObject({
        ownerTabId: 'tab-1',
        currentDraft: {
          id: mockNote.id,
          persistedId: mockNote.id,
          isUnsaved: false,
          title: mockNote.title,
          problem: mockNote.problem,
          content: mockNote.content,
          tags: mockNote.tags,
          wordCount: mockNote.word_count,
          isPinned: mockNote.is_pinned,
          source: 'server',
        },
      })
    })
  })

  describe('setDraftPatch', () => {
    it('patches the active draft fields', () => {
      const store = useNoteEditorStore.getState()

      store.setCurrentDraftId({
        id: 'temp-note-id',
        persistedId: null,
        isUnsaved: true,
        source: 'local-draft',
        ownerTabId: 'tab-1',
      })

      store.setDraftPatch(
        {
          title: 'Updated Title',
          problem: 'Updated problem',
          content: 'Updated content',
          tags: ['updated', 'draft'],
          wordCount: 42,
        },
        'tab-1'
      )

      expect(useNoteEditorStore.getState().currentDraft).toMatchObject({
        id: 'temp-note-id',
        persistedId: null,
        isUnsaved: true,
        source: 'local-draft',
        title: 'Updated Title',
        problem: 'Updated problem',
        content: 'Updated content',
        tags: ['updated', 'draft'],
        wordCount: 42,
      })
    })

    it('ignores patches from a non-owner tab', () => {
      const store = useNoteEditorStore.getState()

      store.setCurrentDraftId({
        id: 'temp-note-id',
        persistedId: null,
        isUnsaved: true,
        source: 'local-draft',
        ownerTabId: 'tab-1',
      })
      store.setDraftPatch({ title: 'Owner title' }, 'tab-1')

      store.setDraftPatch({ title: 'Other tab title' }, 'tab-2')

      expect(useNoteEditorStore.getState().currentDraft?.title).toBe('Owner title')
    })
  })

  describe('setCurrentDraftId', () => {
    it('updates draft identity while preserving existing content fields', () => {
      const store = useNoteEditorStore.getState()

      store.setCurrentDraftId({
        id: 'temp-note-id',
        persistedId: null,
        isUnsaved: true,
        source: 'local-draft',
        ownerTabId: 'tab-1',
      })
      store.setDraftPatch(
        {
          title: 'Draft title',
          problem: 'Draft problem',
          content: 'Draft content',
          tags: ['draft'],
          wordCount: 3,
        },
        'tab-1'
      )

      store.setCurrentDraftId({
        id: 'server-note-id',
        persistedId: 'server-note-id',
        isUnsaved: false,
        source: 'server',
        ownerTabId: 'tab-1',
      })

      expect(useNoteEditorStore.getState()).toMatchObject({
        ownerTabId: 'tab-1',
        currentDraft: {
          id: 'server-note-id',
          persistedId: 'server-note-id',
          isUnsaved: false,
          source: 'server',
          title: 'Draft title',
          problem: 'Draft problem',
          content: 'Draft content',
          tags: ['draft'],
          wordCount: 3,
        },
      })
    })
  })

  describe('reset', () => {
    it('only resets when called by the owning tab', () => {
      const store = useNoteEditorStore.getState()

      store.hydrateFromServer(mockNote, 'tab-1')

      store.reset('tab-2')
      expect(useNoteEditorStore.getState().currentDraft).not.toBeNull()
      expect(useNoteEditorStore.getState().ownerTabId).toBe('tab-1')

      store.reset('tab-1')
      expect(useNoteEditorStore.getState().currentDraft).toBeNull()
      expect(useNoteEditorStore.getState().ownerTabId).toBeNull()
    })

    it('force resets when no owner is provided', () => {
      const store = useNoteEditorStore.getState()

      store.hydrateFromServer(mockNote, 'tab-1')
      store.reset()

      expect(useNoteEditorStore.getState().currentDraft).toBeNull()
      expect(useNoteEditorStore.getState().ownerTabId).toBeNull()
    })
  })
})
