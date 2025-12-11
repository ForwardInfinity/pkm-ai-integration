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
