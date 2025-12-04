// Note-related type definitions

export interface Note {
  id: string;
  user_id: string;
  title: string;
  problem: string | null;
  content: string;
  is_pinned: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  title: string;
  problem?: string;
  content?: string;
}

export interface UpdateNoteInput {
  title?: string;
  problem?: string;
  content?: string;
  is_pinned?: boolean;
}
