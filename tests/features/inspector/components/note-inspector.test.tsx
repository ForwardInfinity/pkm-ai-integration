import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useNoteEditorStore } from '@/stores/note-editor-store'

const mockUseBacklinks = vi.fn()
const mockUseRelatedNotes = vi.fn()
const mockUseIsNoteAnalysisRefreshing = vi.fn()

vi.mock('@/features/notes/hooks', () => ({
  useBacklinks: (...args: unknown[]) => mockUseBacklinks(...args),
  useRelatedNotes: (...args: unknown[]) => mockUseRelatedNotes(...args),
}))

vi.mock('@/lib/note-analysis-refresh', () => ({
  useIsNoteAnalysisRefreshing: (...args: unknown[]) =>
    mockUseIsNoteAnalysisRefreshing(...args),
}))

vi.mock('@/features/inspector/components/ai-tools-section', () => ({
  AIToolsSection: () => <div data-testid="ai-tools-section" />,
}))

vi.mock('@/features/inspector/components/conflicts-section', () => ({
  ConflictsSection: () => <div data-testid="conflicts-section" />,
}))

vi.mock('@/features/inspector/components/related-notes-section', () => ({
  RelatedNotesSection: () => <div data-testid="related-notes-section" />,
}))

vi.mock('@/features/inspector/components/backlinks-section', () => ({
  BacklinksSection: () => <div data-testid="backlinks-section" />,
}))

import { NoteInspector } from '@/features/inspector/components/note-inspector'

describe('NoteInspector', () => {
  beforeEach(() => {
    useNoteEditorStore.getState().reset()
    mockUseBacklinks.mockReturnValue({ data: [] })
    mockUseRelatedNotes.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })
    mockUseIsNoteAnalysisRefreshing.mockReturnValue(false)
  })

  it('reflects the latest draft tags and uses the effective persisted id for server-backed data', () => {
    act(() => {
      const store = useNoteEditorStore.getState()
      store.setCurrentDraftId({
        id: 'temp_abc',
        persistedId: null,
        isUnsaved: true,
        source: 'local-draft',
        ownerTabId: 'tab-1',
      })
      store.setDraftPatch({ tags: ['draft-tag'] }, 'tab-1')
    })

    render(<NoteInspector />)

    expect(screen.getByText('draft-tag')).toBeInTheDocument()
    expect(mockUseBacklinks).toHaveBeenLastCalledWith(null)
    expect(mockUseRelatedNotes).toHaveBeenLastCalledWith(null)

    act(() => {
      const store = useNoteEditorStore.getState()
      store.setCurrentDraftId({
        id: 'server-note-id',
        persistedId: 'server-note-id',
        isUnsaved: false,
        source: 'server',
        ownerTabId: 'tab-1',
      })
      store.setDraftPatch({ tags: ['fresh-tag'] }, 'tab-1')
    })

    expect(screen.getByText('fresh-tag')).toBeInTheDocument()
    expect(screen.queryByText('draft-tag')).not.toBeInTheDocument()
    expect(mockUseBacklinks).toHaveBeenLastCalledWith('server-note-id')
    expect(mockUseRelatedNotes).toHaveBeenLastCalledWith('server-note-id')
  })

  it('shows a refresh indicator while derived analysis is catching up', () => {
    mockUseIsNoteAnalysisRefreshing.mockReturnValue(true)

    act(() => {
      const store = useNoteEditorStore.getState()
      store.setCurrentDraftId({
        id: 'server-note-id',
        persistedId: 'server-note-id',
        isUnsaved: false,
        source: 'server',
        ownerTabId: 'tab-1',
      })
    })

    render(<NoteInspector />)

    expect(screen.getByText('Refreshing analysis...')).toBeInTheDocument()
  })
})
