-- Migration 002: Vector Functions
-- Creates HNSW index and database functions for semantic search, related notes, and backlinks

-- ============================================================================
-- VECTOR INDEX (HNSW)
-- ============================================================================

-- HNSW index for fast approximate nearest neighbor search
-- Using cosine distance (vector_cosine_ops) which is standard for text embeddings
-- Parameters: m=16 (max connections per node), ef_construction=64 (build-time quality)
create index notes_embedding_idx on notes
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

comment on index notes_embedding_idx is 'HNSW index for fast semantic similarity search on note embeddings';

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Function: Semantic search across notes
-- Finds notes semantically similar to a query embedding
create or replace function search_notes(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  title text,
  problem text,
  content text,
  similarity float
)
language sql stable
security invoker
as $$
  select
    n.id,
    n.title,
    n.problem,
    n.content,
    1 - (n.embedding <=> query_embedding) as similarity
  from notes n
  where n.user_id = auth.uid()
    and n.deleted_at is null
    and n.embedding is not null
    and 1 - (n.embedding <=> query_embedding) > match_threshold
  order by n.embedding <=> query_embedding
  limit match_count;
$$;

comment on function search_notes is 'Semantic search: finds notes similar to query embedding above threshold';

-- Function: Find related notes
-- Returns notes semantically similar to a target note
create or replace function get_related_notes(
  target_note_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  problem text,
  similarity float
)
language sql stable
security invoker
as $$
  select
    n.id,
    n.title,
    n.problem,
    1 - (n.embedding <=> target.embedding) as similarity
  from notes n
  cross join (select embedding from notes where id = target_note_id) target
  where n.user_id = auth.uid()
    and n.id != target_note_id
    and n.deleted_at is null
    and n.embedding is not null
    and target.embedding is not null
  order by n.embedding <=> target.embedding
  limit match_count;
$$;

comment on function get_related_notes is 'Returns notes semantically similar to a target note';

-- Function: Get backlinks for a note
-- Returns notes that link to the target note via [[wikilinks]]
create or replace function get_backlinks(
  target_note_id uuid
)
returns table (
  id uuid,
  title text,
  problem text
)
language sql stable
security invoker
as $$
  select n.id, n.title, n.problem
  from note_links nl
  join notes n on n.id = nl.source_note_id
  where nl.target_note_id = target_note_id
    and nl.user_id = auth.uid()
    and n.deleted_at is null
  order by n.updated_at desc;
$$;

comment on function get_backlinks is 'Returns notes that link to the target note (backlinks)';

-- Function: Find potential conflicts
-- Returns note pairs with high semantic similarity that might contain conflicting claims
-- This is a helper for the conflict detection Inngest job
create or replace function find_potential_conflicts(
  target_note_id uuid,
  similarity_threshold float default 0.8,
  match_count int default 10
)
returns table (
  note_id uuid,
  title text,
  problem text,
  content text,
  similarity float
)
language sql stable
security invoker
as $$
  select
    n.id as note_id,
    n.title,
    n.problem,
    n.content,
    1 - (n.embedding <=> target.embedding) as similarity
  from notes n
  cross join (select embedding, user_id from notes where id = target_note_id) target
  where n.user_id = target.user_id
    and n.id != target_note_id
    and n.deleted_at is null
    and n.embedding is not null
    and target.embedding is not null
    and 1 - (n.embedding <=> target.embedding) > similarity_threshold
    -- Exclude notes that already have a conflict with target
    and not exists (
      select 1 from conflicts c
      where (c.note_a_id = least(n.id, target_note_id) and c.note_b_id = greatest(n.id, target_note_id))
    )
  order by n.embedding <=> target.embedding
  limit match_count;
$$;

comment on function find_potential_conflicts is 'Finds semantically similar notes that might conflict (for conflict detection job)';

-- Function: Get conflict count for sidebar badge
-- Returns count of unresolved conflicts for the current user
create or replace function get_unresolved_conflict_count()
returns integer
language sql stable
security invoker
as $$
  select count(*)::integer
  from conflicts
  where user_id = auth.uid()
    and status = 'unresolved';
$$;

comment on function get_unresolved_conflict_count is 'Returns count of unresolved conflicts for sidebar badge';

-- Function: Get notes by tags
-- Returns notes that have any of the specified tags
create or replace function get_notes_by_tags(
  filter_tags text[],
  include_deleted boolean default false
)
returns table (
  id uuid,
  title text,
  problem text,
  tags text[],
  is_pinned boolean,
  updated_at timestamptz
)
language sql stable
security invoker
as $$
  select
    n.id,
    n.title,
    n.problem,
    n.tags,
    n.is_pinned,
    n.updated_at
  from notes n
  where n.user_id = auth.uid()
    and n.tags && filter_tags  -- && is the "overlaps" operator for arrays
    and (include_deleted or n.deleted_at is null)
  order by n.is_pinned desc, n.updated_at desc;
$$;

comment on function get_notes_by_tags is 'Returns notes that have any of the specified tags';

-- Function: Get all unique tags for current user
-- Useful for autocomplete and tag management
create or replace function get_all_tags()
returns table (tag text, count bigint)
language sql stable
security invoker
as $$
  select unnest(tags) as tag, count(*) as count
  from notes
  where user_id = auth.uid()
    and deleted_at is null
  group by tag
  order by count desc, tag;
$$;

comment on function get_all_tags is 'Returns all unique tags with usage count for the current user';
