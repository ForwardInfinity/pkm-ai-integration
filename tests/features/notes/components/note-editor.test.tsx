import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useNoteEditorStore, useTabsStore } from '@/stores'
import type { LocalNote } from '@/lib/local-db'
import type { MarkdownEditorProps } from '@/components/editor/types'

const mockUseNote = vi.fn()
const mockUseNotes = vi.fn()
const mockUseAllTags = vi.fn()
const mockUseAutoSave = vi.fn()
const mockSave = vi.fn()
const mockGetServerId = vi.fn()
const mockGetNoteLocally = vi.fn()
const mockRequeueRecoveredNote = vi.fn()
const mockMarkdownEditor = vi.fn()

vi.mock('@/components/editor', () => ({
  MarkdownEditor: (props: MarkdownEditorProps) => {
    mockMarkdownEditor(props)
    return <div data-testid="markdown-editor">{props.content}</div>
  },
}))

vi.mock('@/features/notes/components/note-actions-dropdown', () => ({
  NoteActionsDropdown: () => null,
}))

vi.mock('@/features/notes/hooks', () => ({
  useNote: (...args: unknown[]) => mockUseNote(...args),
  useNotes: (...args: unknown[]) => mockUseNotes(...args),
}))

vi.mock('@/features/notes/hooks/use-tags', () => ({
  useAllTags: (...args: unknown[]) => mockUseAllTags(...args),
}))

vi.mock('@/features/notes/hooks/use-auto-save', () => ({
  useAutoSave: (...args: unknown[]) => {
    mockUseAutoSave(...args)
    return {
      save: mockSave,
      getServerId: mockGetServerId,
    }
  },
}))

vi.mock('@/hooks/use-beforeunload-save', () => ({
  useBeforeunloadSave: () => undefined,
}))

vi.mock('@/lib/local-db/note-cache', () => ({
  getNoteLocally: (...args: unknown[]) => mockGetNoteLocally(...args),
  getCurrentSessionTempDraftId: () =>
    window.sessionStorage.getItem('refinery-current-session-temp-draft'),
  setCurrentSessionTempDraftId: (tempId: string) =>
    window.sessionStorage.setItem('refinery-current-session-temp-draft', tempId),
  clearCurrentSessionTempDraftId: () =>
    window.sessionStorage.removeItem('refinery-current-session-temp-draft'),
}))

vi.mock('@/lib/local-db/sync-queue', () => ({
  requeueRecoveredNote: (...args: unknown[]) => mockRequeueRecoveredNote(...args),
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
    mockUseAutoSave.mockReset()
    mockSave.mockReset()
    mockGetServerId.mockReset()
    mockGetServerId.mockReturnValue(undefined)
    mockGetNoteLocally.mockResolvedValue(undefined)
    mockRequeueRecoveredNote.mockResolvedValue(undefined)
    mockMarkdownEditor.mockReset()
  })

  it('clears the previous persisted draft when switching to /notes/new', async () => {
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

    await waitFor(() => {
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

  it('recovers error drafts for existing notes without losing tags', async () => {
    const recoveredDraft: LocalNote = {
      id: 'note-123',
      title: 'Recovered title',
      problem: 'Recovered problem',
      content: 'Recovered content #tag',
      wordCount: 3,
      tags: ['tag'],
      updatedAt: Date.now(),
      syncStatus: 'error',
    }

    mockUseNote.mockReturnValue({
      data: {
        id: 'note-123',
        user_id: 'user-1',
        title: 'Server title',
        problem: 'Server problem',
        content: 'Server content',
        tags: [],
        is_pinned: false,
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
      isLoading: false,
      error: null,
    })
    mockGetNoteLocally.mockResolvedValue(recoveredDraft)

    useTabsStore.setState({
      tabs: [{ id: 'tab-1', noteId: 'note-123', title: 'Recovered title' }],
      activeTabId: 'tab-1',
      showListView: false,
    })

    render(<NoteEditor noteId="note-123" tabId="tab-1" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Recovered title')).toBeInTheDocument()
    })

    expect(screen.getByTestId('markdown-editor')).toHaveTextContent('Recovered content #tag')
    expect(mockRequeueRecoveredNote).toHaveBeenCalledWith(recoveredDraft)
    expect(useNoteEditorStore.getState().currentDraft).toMatchObject({
      id: 'note-123',
      title: 'Recovered title',
      tags: ['tag'],
    })
  })

  it('surfaces version-conflicted drafts without auto-retrying them', async () => {
    const conflictedDraft: LocalNote = {
      id: 'note-123',
      title: 'Conflicted local title',
      problem: 'Conflicted local problem',
      content: 'Conflicted local content',
      wordCount: 3,
      tags: ['tag'],
      updatedAt: Date.now(),
      syncStatus: 'error',
      syncError: 'version-conflict',
      syncErrorMessage:
        'This local draft could not sync because the note changed elsewhere.',
      latestServerVersion: '2024-01-02T00:00:00Z',
    }

    mockUseNote.mockReturnValue({
      data: {
        id: 'note-123',
        user_id: 'user-1',
        title: 'Server title',
        problem: 'Server problem',
        content: 'Server content',
        tags: [],
        is_pinned: false,
        word_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
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
      isLoading: false,
      error: null,
    })
    mockGetNoteLocally.mockResolvedValue(conflictedDraft)

    useTabsStore.setState({
      tabs: [{ id: 'tab-1', noteId: 'note-123', title: 'Conflicted local title' }],
      activeTabId: 'tab-1',
      showListView: false,
    })

    render(<NoteEditor noteId="note-123" tabId="tab-1" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Conflicted local title')).toBeInTheDocument()
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This local draft could not sync because the note changed elsewhere.'
    )
    expect(mockRequeueRecoveredNote).not.toHaveBeenCalled()
  })

  it('reconnects the latest unsynced temp draft on /notes/new', async () => {
    const recoveredDraft: LocalNote = {
      id: 'temp_session_1',
      tempId: 'temp_session_1',
      title: 'Recovered temp draft',
      problem: '',
      content: 'Unsynced draft #tag',
      wordCount: 3,
      tags: ['tag'],
      updatedAt: Date.now(),
      syncStatus: 'pending',
    }

    window.sessionStorage.setItem(
      'refinery-current-session-temp-draft',
      'temp_session_1'
    )
    mockGetNoteLocally.mockImplementation(async (id: string) =>
      id === 'temp_session_1' ? recoveredDraft : undefined
    )

    useTabsStore.setState({
      tabs: [{ id: 'tab-new', noteId: 'new', title: 'New Note' }],
      activeTabId: 'tab-new',
      showListView: false,
    })

    render(<NoteEditor noteId="new" tabId="tab-new" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Recovered temp draft')).toBeInTheDocument()
    })

    expect(screen.getByTestId('markdown-editor')).toHaveTextContent('Unsynced draft #tag')
    expect(mockRequeueRecoveredNote).toHaveBeenCalledWith(recoveredDraft)
    expect(mockUseAutoSave).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 'temp_session_1',
      onExternalChange: expect.any(Function),
    }))
    expect(useNoteEditorStore.getState().currentDraft).toMatchObject({
      id: 'temp_session_1',
      title: 'Recovered temp draft',
      tags: ['tag'],
    })
  })

  it('uses normalized wikilink resolution for editor clicks and skips the current note', async () => {
    mockUseNote.mockReturnValue({
      data: {
        id: 'note-current',
        user_id: 'user-1',
        title: 'Foo',
        problem: null,
        content: 'See [[foo]]',
        tags: [],
        is_pinned: false,
        word_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
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
      isLoading: false,
      error: null,
    })
    mockUseNotes.mockReturnValue({
      data: [
        {
          id: 'note-current',
          title: 'Foo',
          problem: null,
          tags: [],
          is_pinned: false,
          updated_at: '2024-01-02T00:00:00Z',
          word_count: 2,
        },
        {
          id: 'note-target',
          title: 'foo',
          problem: 'Target problem',
          tags: [],
          is_pinned: false,
          updated_at: '2024-01-01T00:00:00Z',
          word_count: 1,
        },
      ],
    })

    useTabsStore.setState({
      tabs: [{ id: 'tab-1', noteId: 'note-current', title: 'Foo' }],
      activeTabId: 'tab-1',
      showListView: false,
    })

    render(<NoteEditor noteId="note-current" tabId="tab-1" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Foo')).toBeInTheDocument()
    })

    const markdownEditorProps = mockMarkdownEditor.mock.lastCall?.[0] as
      | MarkdownEditorProps
      | undefined

    expect(markdownEditorProps?.wikiLinkConfig).toBeDefined()

    act(() => {
      markdownEditorProps?.wikiLinkConfig?.onWikiLinkClick?.('  FOO  ')
    })

    expect(useTabsStore.getState().tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          noteId: 'note-target',
          title: 'foo',
        }),
      ])
    )
    expect(useTabsStore.getState().activeTabId).not.toBe('tab-1')
  })
})
