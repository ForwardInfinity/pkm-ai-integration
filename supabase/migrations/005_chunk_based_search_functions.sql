-- Migration 005: Update search functions to use note_chunks for semantic search
-- Provides full semantic coverage by searching chunk-level embeddings

-- ============================================================================
-- HYBRID SEARCH (using chunks for semantic component)
-- ============================================================================

create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int default 10,
  full_text_weight float default 1.0,
  semantic_weight float default 1.0,
  rrf_k int default 50,
  similarity_threshold float default 0.3
)
returns table (
  id uuid,
  title text,
  problem text,
  content text,
  snippet text,
  match_type text,
  rrf_score float
)
language sql stable
security invoker
set search_path = public, extensions
as $$
  with full_text as (
    select
      n.id,
      n.title,
      n.problem,
      n.content,
      ts_headline(
        'english',
        n.content,
        websearch_to_tsquery('english', query_text),
        'MaxWords=25, MinWords=10, StartSel=**, StopSel=**'
      ) as snippet,
      row_number() over (
        order by ts_rank_cd(n.fts, websearch_to_tsquery('english', query_text)) desc
      ) as rank_ix
    from notes n
    where n.user_id = (select auth.uid())
      and n.deleted_at is null
      and n.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank_cd(n.fts, websearch_to_tsquery('english', query_text)) desc
    limit match_count * 2
  ),
  -- Semantic search using chunks (best chunk per note)
  semantic_chunks as (
    select
      nc.note_id,
      nc.text_chunk,
      1 - (nc.embedding <=> query_embedding) as similarity,
      row_number() over (partition by nc.note_id order by nc.embedding <=> query_embedding) as chunk_rank
    from note_chunks nc
    join notes n on n.id = nc.note_id
    where nc.user_id = (select auth.uid())
      and n.deleted_at is null
      and 1 - (nc.embedding <=> query_embedding) >= similarity_threshold
  ),
  semantic as (
    select
      n.id,
      n.title,
      n.problem,
      n.content,
      substring(sc.text_chunk, 1, 150) as snippet,
      row_number() over (order by sc.similarity desc) as rank_ix
    from semantic_chunks sc
    join notes n on n.id = sc.note_id
    where sc.chunk_rank = 1  -- Best matching chunk per note
    limit match_count * 2
  )
  select
    coalesce(ft.id, sem.id) as id,
    coalesce(ft.title, sem.title) as title,
    coalesce(ft.problem, sem.problem) as problem,
    coalesce(ft.content, sem.content) as content,
    coalesce(ft.snippet, sem.snippet) as snippet,
    case
      when ft.id is not null and sem.id is not null then 'hybrid'
      when ft.id is not null then 'keyword'
      else 'semantic'
    end as match_type,
    (coalesce(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight +
     coalesce(1.0 / (rrf_k + sem.rank_ix), 0.0) * semantic_weight) as rrf_score
  from full_text ft
  full outer join semantic sem on ft.id = sem.id
  order by
    (coalesce(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight +
     coalesce(1.0 / (rrf_k + sem.rank_ix), 0.0) * semantic_weight) desc
  limit match_count;
$$;

comment on function hybrid_search is 'Hybrid search combining full-text keyword search with chunk-based semantic vector search using Reciprocal Rank Fusion (RRF). Uses note_chunks for full semantic coverage of long notes.';

-- ============================================================================
-- GET RELATED NOTES (chunk-to-chunk similarity)
-- ============================================================================

create or replace function get_related_notes(
  target_note_id uuid,
  match_count int default 5,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  title text,
  problem text,
  similarity float
)
language sql stable
security invoker
set search_path = public, extensions
as $$
  with target_chunks as (
    select embedding
    from note_chunks
    where note_id = target_note_id
  ),
  candidate_matches as (
    select
      nc.note_id,
      max(1 - (nc.embedding <=> tc.embedding)) as max_similarity
    from target_chunks tc
    cross join lateral (
      select note_id, embedding
      from note_chunks
      where user_id = (select auth.uid())
        and note_id != target_note_id
      order by embedding <=> tc.embedding
      limit match_count * 5
    ) nc
    group by nc.note_id
    having max(1 - (nc.embedding <=> tc.embedding)) >= match_threshold
  )
  select
    n.id,
    n.title,
    n.problem,
    cm.max_similarity as similarity
  from candidate_matches cm
  join notes n on n.id = cm.note_id
  where n.deleted_at is null
  order by cm.max_similarity desc
  limit match_count;
$$;

comment on function get_related_notes is 'Returns notes semantically similar to a target note using chunk-level embeddings for better coverage of long documents';

-- ============================================================================
-- FIND POTENTIAL CONFLICTS (chunk-based with 0.8 threshold)
-- ============================================================================

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
set search_path = public, extensions
as $$
  with target_note_user as (
    select user_id from notes where id = target_note_id
  ),
  target_chunks as (
    select embedding
    from note_chunks
    where note_id = target_note_id
  ),
  candidate_matches as (
    select
      nc.note_id,
      max(1 - (nc.embedding <=> tc.embedding)) as max_similarity
    from target_chunks tc
    cross join lateral (
      select nc_inner.note_id, nc_inner.embedding
      from note_chunks nc_inner
      where nc_inner.user_id = (select user_id from target_note_user)
        and nc_inner.note_id != target_note_id
      order by nc_inner.embedding <=> tc.embedding
      limit match_count * 5
    ) nc
    group by nc.note_id
    having max(1 - (nc.embedding <=> tc.embedding)) > similarity_threshold
  )
  select
    n.id as note_id,
    n.title,
    n.problem,
    n.content,
    cm.max_similarity as similarity
  from candidate_matches cm
  join notes n on n.id = cm.note_id
  where n.deleted_at is null
    -- Skip pairs with DISMISSED conflicts (allow re-detection otherwise)
    and not exists (
      select 1 from conflicts c
      where c.note_a_id = least(n.id, target_note_id)
        and c.note_b_id = greatest(n.id, target_note_id)
        and c.status = 'dismissed'
    )
  order by cm.max_similarity desc
  limit match_count;
$$;

comment on function find_potential_conflicts is 'Finds semantically similar notes for conflict detection using chunk-level embeddings (skips dismissed pairs)';
