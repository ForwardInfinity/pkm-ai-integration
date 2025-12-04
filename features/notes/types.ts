// Note-related type definitions
// These are feature-level types derived from the database schema

import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/types/database.types';

// Re-export database row types for convenience
export type Note = Tables<'notes'>;
export type NoteInsert = TablesInsert<'notes'>;
export type NoteUpdate = TablesUpdate<'notes'>;

export type Conflict = Tables<'conflicts'>;
export type ConflictInsert = TablesInsert<'conflicts'>;
export type ConflictUpdate = TablesUpdate<'conflicts'>;

export type NoteLink = Tables<'note_links'>;
export type NoteLinkInsert = TablesInsert<'note_links'>;
export type NoteLinkUpdate = TablesUpdate<'note_links'>;

export type Profile = Tables<'profiles'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

// Enum types
export type ConflictStatus = Enums<'conflict_status'>;
export type UserRole = Enums<'user_role'>;

// Input types for creating/updating notes (without system-managed fields)
export interface CreateNoteInput {
  title: string;
  problem?: string | null;
  content?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  problem?: string | null;
  content?: string;
  tags?: string[];
  is_pinned?: boolean;
  word_count?: number;
}

// Types for database function return values
export interface RelatedNote {
  id: string;
  title: string;
  problem: string | null;
  similarity: number;
}

export interface SearchResult {
  id: string;
  title: string;
  problem: string | null;
  content: string;
  similarity: number;
}

export interface BacklinkNote {
  id: string;
  title: string;
  problem: string | null;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface PotentialConflict {
  note_id: string;
  title: string;
  problem: string | null;
  content: string;
  similarity: number;
}

// Note list item (for sidebar/list views)
export interface NoteListItem {
  id: string;
  title: string;
  problem: string | null;
  tags: string[];
  is_pinned: boolean;
  updated_at: string;
  word_count: number;
}

// Conflict with related notes (for conflict resolution UI)
export interface ConflictWithNotes extends Conflict {
  note_a: Note;
  note_b: Note;
}
