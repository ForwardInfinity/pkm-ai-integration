import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useNoteEditorStore } from '@/stores/note-editor-store'

const mockCritique = vi.fn()
const mockDismiss = vi.fn()

vi.mock('@/features/ai/hooks/use-critique-note', () => ({
  useCritiqueNote: () => ({
    isLoading: false,
    error: null,
    result: null,
    critique: mockCritique,
    dismiss: mockDismiss,
  }),
}))

import { AIToolsSection } from '@/features/inspector/components/ai-tools-section'

describe('AIToolsSection', () => {
  beforeEach(() => {
    useNoteEditorStore.getState().reset()
    mockCritique.mockReset()
    mockDismiss.mockReset()
  })

  it('uses the latest draft content when running critique', () => {
    act(() => {
      const store = useNoteEditorStore.getState()
      store.hydrateFromServer(
        {
          id: 'note-1',
          user_id: 'user-1',
          title: 'Original Title',
          problem: 'Original problem',
          content: 'Original content',
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
        'tab-1'
      )
      store.setDraftPatch(
        {
          title: 'Edited Title',
          problem: 'Edited problem',
          content: 'Freshly typed content',
        },
        'tab-1'
      )
    })

    render(<AIToolsSection noteId="note-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Critique This Note' }))

    expect(mockCritique).toHaveBeenCalledWith(
      'Edited Title',
      'Edited problem',
      'Freshly typed content'
    )
  })

  it('disables critique for temp ids', () => {
    act(() => {
      const store = useNoteEditorStore.getState()
      store.setCurrentDraftId({
        id: 'temp_abc',
        persistedId: null,
        isUnsaved: true,
        source: 'local-draft',
        ownerTabId: 'tab-1',
      })
      store.setDraftPatch(
        {
          title: 'Unsaved title',
          problem: 'Unsaved problem',
          content: 'Unsaved content',
        },
        'tab-1'
      )
    })

    render(<AIToolsSection noteId="temp_abc" />)

    expect(screen.getByRole('button', { name: 'Critique This Note' })).toBeDisabled()
    expect(screen.getByText('Save your note to critique it with AI')).toBeInTheDocument()
    expect(mockCritique).not.toHaveBeenCalled()
  })
})
