// Conflict-related type definitions

export type ConflictStatus = 'unresolved' | 'resolved' | 'dismissed';

export interface Conflict {
  id: string;
  user_id: string;
  note_a_id: string;
  note_b_id: string;
  explanation: string;
  status: ConflictStatus;
  created_at: string;
  resolved_at: string | null;
}
