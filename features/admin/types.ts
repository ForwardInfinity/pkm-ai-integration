// Admin feature type definitions

export type UserRole = "user" | "admin";

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  admin_count: number;
  total_notes: number;
  active_notes: number;
  total_word_count: number;
  active_conflicts: number;
  total_conflicts: number;
  embedding_pending: number;
  embedding_processing: number;
  embedding_completed: number;
  embedding_failed: number;
  total_chunks: number;
}

export interface EmbeddingFailure {
  id: string;
  title: string;
  error: string | null;
  failed_at: string | null;
}

export interface EmbeddingDetails {
  pending_count: number;
  processing_count: number;
  completed_count: number;
  failed_count: number;
  total_chunks: number;
  recent_failures: EmbeddingFailure[];
}
