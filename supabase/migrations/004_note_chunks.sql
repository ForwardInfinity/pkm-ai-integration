-- Migration 004: Create note_chunks table for semantic chunking
-- Stores embeddings per chunk for full semantic coverage of long notes

-- ============================================================================
-- TABLE: note_chunks
-- ============================================================================

create table note_chunks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  content_start int not null,  -- Character offset start
  content_end int not null,    -- Character offset end
  text_chunk text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),

  -- Ensure chunks are ordered within a note
  constraint note_chunks_unique_index unique (note_id, chunk_index),
  -- Ensure valid offsets
  constraint note_chunks_valid_offsets check (content_start >= 0 and content_end > content_start)
);

-- Comments
comment on table note_chunks is 'Stores text chunks and their embeddings for semantic search with full coverage of long notes';
comment on column note_chunks.chunk_index is 'Zero-based index of chunk within note';
comment on column note_chunks.content_start is 'Character offset where chunk starts in raw text';
comment on column note_chunks.content_end is 'Character offset where chunk ends in raw text';
comment on column note_chunks.text_chunk is 'The actual text content of this chunk';
comment on column note_chunks.embedding is 'Vector embedding (1536 dims) for this chunk';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- HNSW index for vector similarity search
create index note_chunks_embedding_idx on note_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Fast lookup by note_id (for deleting/updating chunks)
create index note_chunks_note_id_idx on note_chunks(note_id);

-- Fast filtering by user_id (for RLS and queries)
create index note_chunks_user_id_idx on note_chunks(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table note_chunks enable row level security;

-- Users can only view their own note chunks
create policy "Users can view their own note chunks"
  on note_chunks for select
  using ((select auth.uid()) = user_id);

-- Users can only insert their own note chunks
create policy "Users can insert their own note chunks"
  on note_chunks for insert
  with check ((select auth.uid()) = user_id);

-- Users can only update their own note chunks
create policy "Users can update their own note chunks"
  on note_chunks for update
  using ((select auth.uid()) = user_id);

-- Users can only delete their own note chunks
create policy "Users can delete their own note chunks"
  on note_chunks for delete
  using ((select auth.uid()) = user_id);
