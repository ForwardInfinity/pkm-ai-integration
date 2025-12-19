export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conflict_judgments: {
        Row: {
          confidence: number
          created_at: string
          explanation: string | null
          id: string
          judgment_result: Database["public"]["Enums"]["judgment_result"]
          model: string
          note_a_id: string
          note_b_id: string
          pair_content_hash: string
          reasoning: string
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          explanation?: string | null
          id?: string
          judgment_result: Database["public"]["Enums"]["judgment_result"]
          model: string
          note_a_id: string
          note_b_id: string
          pair_content_hash: string
          reasoning: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          explanation?: string | null
          id?: string
          judgment_result?: Database["public"]["Enums"]["judgment_result"]
          model?: string
          note_a_id?: string
          note_b_id?: string
          pair_content_hash?: string
          reasoning?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conflict_judgments_note_a_id_fkey"
            columns: ["note_a_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflict_judgments_note_b_id_fkey"
            columns: ["note_b_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      conflicts: {
        Row: {
          conflict_type: Database["public"]["Enums"]["conflict_type"]
          created_at: string
          explanation: string
          id: string
          note_a_id: string
          note_b_id: string
          status: Database["public"]["Enums"]["conflict_status"]
          user_id: string
        }
        Insert: {
          conflict_type?: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          explanation: string
          id?: string
          note_a_id: string
          note_b_id: string
          status?: Database["public"]["Enums"]["conflict_status"]
          user_id: string
        }
        Update: {
          conflict_type?: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          explanation?: string
          id?: string
          note_a_id?: string
          note_b_id?: string
          status?: Database["public"]["Enums"]["conflict_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conflicts_note_a_id_fkey"
            columns: ["note_a_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflicts_note_b_id_fkey"
            columns: ["note_b_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_chunks: {
        Row: {
          chunk_index: number
          content_end: number
          content_start: number
          created_at: string
          embedding: string
          id: string
          note_id: string
          text_chunk: string
          user_id: string
        }
        Insert: {
          chunk_index: number
          content_end: number
          content_start: number
          created_at?: string
          embedding: string
          id?: string
          note_id: string
          text_chunk: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content_end?: number
          content_start?: number
          created_at?: string
          embedding?: string
          id?: string
          note_id?: string
          text_chunk?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_chunks_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_links: {
        Row: {
          created_at: string
          id: string
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_note_id: string
          target_note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_note_id?: string
          target_note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_links_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          embedding: string | null
          embedding_content_hash: string | null
          embedding_error: string | null
          embedding_model: string | null
          embedding_requested_at: string | null
          embedding_status: string
          embedding_updated_at: string | null
          fts: unknown | null
          id: string
          is_pinned: boolean
          problem: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          embedding?: string | null
          embedding_content_hash?: string | null
          embedding_error?: string | null
          embedding_model?: string | null
          embedding_requested_at?: string | null
          embedding_status?: string
          embedding_updated_at?: string | null
          id?: string
          is_pinned?: boolean
          problem?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          embedding?: string | null
          embedding_content_hash?: string | null
          embedding_error?: string | null
          embedding_model?: string | null
          embedding_requested_at?: string | null
          embedding_status?: string
          embedding_updated_at?: string | null
          id?: string
          is_pinned?: boolean
          problem?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_potential_conflicts: {
        Args: {
          match_count?: number
          similarity_threshold?: number
          target_note_id: string
        }
        Returns: {
          content: string
          note_id: string
          problem: string
          similarity: number
          title: string
        }[]
      }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          total_users: number
          admin_count: number
          total_notes: number
          active_notes: number
          total_word_count: number
          active_conflicts: number
          total_conflicts: number
          embedding_pending: number
          embedding_processing: number
          embedding_completed: number
          embedding_failed: number
          total_chunks: number
        }[]
      }
      get_admin_embedding_details: {
        Args: never
        Returns: {
          pending_count: number
          processing_count: number
          completed_count: number
          failed_count: number
          total_chunks: number
          recent_failures: Json
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          id: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
        }[]
      }
      get_all_tags: {
        Args: never
        Returns: {
          count: number
          tag: string
        }[]
      }
      get_backlinks: {
        Args: { p_target_note_id: string }
        Returns: {
          id: string
          problem: string
          title: string
        }[]
      }
      get_notes_by_tags: {
        Args: { filter_tags: string[]; include_deleted?: boolean }
        Returns: {
          id: string
          is_pinned: boolean
          problem: string
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      get_related_notes: {
        Args: {
          match_count?: number
          match_threshold?: number
          target_note_id: string
        }
        Returns: {
          id: string
          problem: string
          similarity: number
          title: string
        }[]
      }
      get_unresolved_conflict_count: { Args: never; Returns: number }
      hybrid_search: {
        Args: {
          query_text: string
          query_embedding: string
          match_count?: number
          full_text_weight?: number
          semantic_weight?: number
          rrf_k?: number
          similarity_threshold?: number
        }
        Returns: {
          id: string
          title: string
          problem: string
          content: string
          snippet: string
          match_type: string
          rrf_score: number
        }[]
      }
      is_current_user_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      conflict_status: "active" | "dismissed"
      conflict_type: "contradiction" | "tension"
      judgment_result: "no_conflict" | "tension" | "contradiction"
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      conflict_status: ["active", "dismissed"],
      conflict_type: ["contradiction", "tension"],
      judgment_result: ["no_conflict", "tension", "contradiction"],
      user_role: ["user", "admin"],
    },
  },
} as const
