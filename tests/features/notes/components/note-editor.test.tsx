import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useNoteEditorStore, useTabsStore } from '@/stores'

const mockUseNote = vi.fn()
const mockUseNotes = vi.fn()
const mockUseAllTags = vi.fn()
const mockSave = vi.fn()
const mockGetServerId = vi.fn()

vi.mock('@/components/editor', () => ({
  MarkdownEditor: ({ content }: { content: string }) => (
    <div data-testid="markdown-editor">{content}</div>
  ),
}))

vi.mock('@/features/notes/hooks', () => ({
  useNote: (...args: unknown[]) => mockUseNote(...args),
  useNotes: (...args: unknown[]) => mockUseNotes(...args),
}))

vi.mock('@/features/notes/hooks/use-tags', () => ({
  useAllTags: (...args: unknown[]) => mockUseAllTags(...args),
}))

vi.mock('@/features/notes/hooks/use-auto-save', () => ({
  useAutoSave: () => ({
    save: mockSave,
    getServerId: mockGetServerId,
  }),
}))

vi.mock('@/hooks/use-beforeunload-save', () => ({
  useBeforeunloadSave: () => undefined,
}))

vi.mock('@/features/ai', () => ({
  useReconstructProblem: () => ({
    isLoading: false,
    currentSuggestion: null,
    showAlternatives: false,
    reconstruct: vi.fn(),
    fetchAlternatives: vi.fn(),
    selectAlternative: vi.fn(),
    reset: vi.fn(),
    result: null,
  }),
  useCleanNote: () => ({
    isLoading: false,
    error: null,
    result: null,
    original: null,
    clean: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  }),
  CleanDiffTitle: () => null,
  CleanDiffField: () => null,
  CleanDiffContent: () => null,
  CleanNoteActionBar: () => null,
  CleanNotePreviewModal: () => null,
}))

import { NoteEditor } from '@/features/notes/components/note-editor'

describe('NoteEditor', () => {
  beforeEach(() => {
    useNoteEditorStore.getState().reset()
    useTabsStore.getState().reset()

    mockUseNote.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
    mockUseNotes.mockReturnValue({ data: [] })
    mockUseAllTags.mockReturnValue({ data: [] })
    mockSave.mockReset()
    mockGetServerId.mockReset()
    mockGetServerId.mockReturnValue(undefined)
  })

  it('clears the previous persisted draft when switching to /notes/new', () => {
    useNoteEditorStore.getState().hydrateFromServer(
      {
        id: 'server-note-id',
        user_id: 'user-1',
        title: 'Persisted title',
        problem: 'Persisted problem',
        content: 'Persisted content',
        tags: ['persisted-tag'],
        is_pinned: true,
        word_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
        embedding: null,
        embedding_content_hash: null,
        embedding_error: null,
        embedding_model: null,
        embedding_requested_at: null,
        embedding_status: 'pending',
        embedding_updated_at: null,
        fts: null,
      },
      'tab-old'
    )

    useTabsStore.setState({
      tabs: [{ id: 'tab-new', noteId: 'new', title: 'New Note' }],
      activeTabId: 'tab-new',
      showListView: false,
    })

    render(<NoteEditor noteId="new" tabId="tab-new" />)

    expect(useNoteEditorStore.getState().currentDraft).toMatchObject({
      id: 'temp_test-id-1',
      persistedId: null,
      isUnsaved: true,
      source: 'local-draft',
      title: '',
      problem: '',
      content: '',
      tags: [],
      wordCount: 0,
      isPinned: undefined,
    })
  })
})
