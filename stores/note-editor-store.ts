"use client"

import { create } from "zustand"
import type { Note } from "@/features/notes/types"

// State for the current note being edited
interface NoteEditorState {
  // Current note ID (null when not editing)
  currentNoteId: string | null
  // Current note data (null when not loaded or new note)
  currentNote: Note | null
}

// Actions for the note editor
interface NoteEditorActions {
  setCurrentNoteId: (id: string | null) => void
  setCurrentNote: (note: Note | null) => void
  reset: () => void
}

// Combined store type
type NoteEditorStore = NoteEditorState & NoteEditorActions

// Initial state
const initialState: NoteEditorState = {
  currentNoteId: null,
  currentNote: null,
}

export const useNoteEditorStore = create<NoteEditorStore>((set) => ({
  ...initialState,

  setCurrentNoteId: (id) => set({ currentNoteId: id }),

  setCurrentNote: (note) =>
    set({
      currentNote: note,
      currentNoteId: note?.id ?? null,
    }),

  reset: () => set(initialState),
}))

// Selector hooks for performance optimization
export const useCurrentNoteId = () =>
  useNoteEditorStore((state) => state.currentNoteId)

export const useCurrentNote = () =>
  useNoteEditorStore((state) => state.currentNote)

export const useNoteEditorActions = () =>
  useNoteEditorStore((state) => ({
    setCurrentNoteId: state.setCurrentNoteId,
    setCurrentNote: state.setCurrentNote,
    reset: state.reset,
  }))
