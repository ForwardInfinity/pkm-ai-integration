// Conflict-related type definitions

export type ConflictStatus = 'active' | 'dismissed';
export type ConflictType = 'contradiction' | 'tension';

export interface Conflict {
  id: string;
  user_id: string;
  note_a_id: string;
  note_b_id: string;
  explanation: string;
  conflict_type: ConflictType;
  status: ConflictStatus;
  created_at: string;
}

/** Conflict with embedded note details for list display */
export interface ConflictWithNotes {
  id: string;
  explanation: string;
  conflict_type: ConflictType;
  status: ConflictStatus;
  created_at: string;
  note_a: { id: string; title: string };
  note_b: { id: string; title: string };
}

/** Conflict from perspective of a specific note (for inspector panel) */
export interface NoteConflict {
  id: string;
  explanation: string;
  conflict_type: ConflictType;
  otherNoteId: string;
  otherNoteTitle: string;
}
