"use client"

import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"
import type { Note } from "@/features/notes/types"

export interface CurrentDraftNote {
  id: string | null
  persistedId: string | null
  isUnsaved: boolean
  title: string
  problem: string
  content: string
  tags: string[]
  wordCount: number
  isPinned?: boolean
  source: "server" | "local-draft"
}

interface SetCurrentDraftIdInput {
  id: string | null
  persistedId: string | null
  isUnsaved: boolean
  source: CurrentDraftNote["source"]
  ownerTabId?: string | null
}

interface NoteEditorState {
  ownerTabId: string | null
  currentDraft: CurrentDraftNote | null
}

interface NoteEditorActions {
  hydrateFromServer: (note: Note, ownerTabId?: string | null) => void
  setDraftPatch: (
    patch: Partial<CurrentDraftNote>,
    ownerTabId?: string | null
  ) => void
  setCurrentDraftId: (input: SetCurrentDraftIdInput) => void
  reset: (ownerTabId?: string | null) => void
}

type NoteEditorStore = NoteEditorState & NoteEditorActions

const createEmptyDraft = (): CurrentDraftNote => ({
  id: null,
  persistedId: null,
  isUnsaved: true,
  title: "",
  problem: "",
  content: "",
  tags: [],
  wordCount: 0,
  source: "local-draft",
})

const createDraftFromServerNote = (note: Note): CurrentDraftNote => ({
  id: note.id,
  persistedId: note.id,
  isUnsaved: false,
  title: note.title ?? "",
  problem: note.problem ?? "",
  content: note.content ?? "",
  tags: note.tags ?? [],
  wordCount: note.word_count ?? 0,
  isPinned: note.is_pinned,
  source: "server",
})

const initialState: NoteEditorState = {
  ownerTabId: null,
  currentDraft: null,
}

export const useNoteEditorStore = create<NoteEditorStore>((set) => ({
  ...initialState,

  hydrateFromServer: (note, ownerTabId) =>
    set((state) => ({
      ownerTabId: ownerTabId ?? state.ownerTabId,
      currentDraft: createDraftFromServerNote(note),
    })),

  setDraftPatch: (patch, ownerTabId) =>
    set((state) => {
      if (ownerTabId && state.ownerTabId && state.ownerTabId !== ownerTabId) {
        return state
      }

      return {
        ownerTabId: ownerTabId ?? state.ownerTabId,
        currentDraft: {
          ...(state.currentDraft ?? createEmptyDraft()),
          ...patch,
        },
      }
    }),

  setCurrentDraftId: ({ id, persistedId, isUnsaved, source, ownerTabId }) =>
    set((state) => ({
      ownerTabId: ownerTabId ?? state.ownerTabId,
      currentDraft: {
        ...(state.currentDraft ?? createEmptyDraft()),
        id,
        persistedId,
        isUnsaved,
        source,
      },
    })),

  reset: (ownerTabId) =>
    set((state) => {
      if (ownerTabId && state.ownerTabId && state.ownerTabId !== ownerTabId) {
        return state
      }

      return initialState
    }),
}))

export const useCurrentDraft = () =>
  useNoteEditorStore((state) => state.currentDraft)

export const useCurrentDraftId = () =>
  useNoteEditorStore((state) => state.currentDraft?.id ?? null)

export const useCurrentPersistedNoteId = () =>
  useNoteEditorStore((state) => state.currentDraft?.persistedId ?? null)

// Backwards-compatible aliases while consumers migrate to draft terminology.
export const useCurrentNote = useCurrentDraft
export const useCurrentNoteId = useCurrentDraftId

export const useNoteEditorActions = () =>
  useNoteEditorStore(
    useShallow((state) => ({
      hydrateFromServer: state.hydrateFromServer,
      setDraftPatch: state.setDraftPatch,
      setCurrentDraftId: state.setCurrentDraftId,
      reset: state.reset,
    }))
  )
