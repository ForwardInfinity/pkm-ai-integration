"use client"

import { create } from "zustand"
import type { Note } from "@/features/notes/types"

// State for the current note being edited
interface NoteEditorState {
  // Current note ID (null when not editing)
  currentNoteId: string | null
  // Current note data (null when not loaded or new note)
  currentNote: Note | null
  // Whether the note is being saved
  isSaving: boolean
  // Whether the note has unsaved changes
  hasUnsavedChanges: boolean
}

// Actions for the note editor
interface NoteEditorActions {
  setCurrentNoteId: (id: string | null) => void
  setCurrentNote: (note: Note | null) => void
  setIsSaving: (saving: boolean) => void
  setHasUnsavedChanges: (hasChanges: boolean) => void
  reset: () => void
}

// Combined store type
type NoteEditorStore = NoteEditorState & NoteEditorActions

// Initial state
const initialState: NoteEditorState = {
  currentNoteId: null,
  currentNote: null,
  isSaving: false,
  hasUnsavedChanges: false,
}

export const useNoteEditorStore = create<NoteEditorStore>((set) => ({
  ...initialState,

  setCurrentNoteId: (id) => set({ currentNoteId: id }),

  setCurrentNote: (note) =>
    set({
      currentNote: note,
      currentNoteId: note?.id ?? null,
    }),

  setIsSaving: (saving) => set({ isSaving: saving }),

  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  reset: () => set(initialState),
}))

// Selector hooks for performance optimization
export const useCurrentNoteId = () =>
  useNoteEditorStore((state) => state.currentNoteId)

export const useCurrentNote = () =>
  useNoteEditorStore((state) => state.currentNote)

export const useIsSaving = () =>
  useNoteEditorStore((state) => state.isSaving)

export const useHasUnsavedChanges = () =>
  useNoteEditorStore((state) => state.hasUnsavedChanges)

export const useNoteEditorActions = () =>
  useNoteEditorStore((state) => ({
    setCurrentNoteId: state.setCurrentNoteId,
    setCurrentNote: state.setCurrentNote,
    setIsSaving: state.setIsSaving,
    setHasUnsavedChanges: state.setHasUnsavedChanges,
    reset: state.reset,
  }))
