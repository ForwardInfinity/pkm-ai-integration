// Auto-generated Supabase types will go here
// Run: npx supabase gen types typescript --project-id <project-id> > types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Placeholder - will be generated from Supabase schema
export interface Database {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          problem: string | null;
          content: string;
          is_pinned: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          problem?: string | null;
          content?: string;
          is_pinned?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          problem?: string | null;
          content?: string;
          is_pinned?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conflicts: {
        Row: {
          id: string;
          user_id: string;
          note_a_id: string;
          note_b_id: string;
          explanation: string;
          status: 'unresolved' | 'resolved' | 'dismissed';
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          note_a_id: string;
          note_b_id: string;
          explanation: string;
          status?: 'unresolved' | 'resolved' | 'dismissed';
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          note_a_id?: string;
          note_b_id?: string;
          explanation?: string;
          status?: 'unresolved' | 'resolved' | 'dismissed';
          created_at?: string;
          resolved_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
