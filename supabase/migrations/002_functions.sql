-- Migration 002: Functions & Triggers
-- All database functions and triggers for Refinery

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id)
  values (new.id);
  return new;
end;
$$;

-- Delete active conflicts when note is soft-deleted
-- (dismissed conflicts stay for record-keeping)
create or replace function on_note_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from conflicts
    where (note_a_id = new.id or note_b_id = new.id)
      and status = 'active';
  end if;
  return new;
end;
$$;

-- Re-detect conflicts when note is restored from trash
-- Note: This just deletes stale dismissed records if the other note is also deleted
-- Actual re-detection happens via Inngest when embedding is regenerated
create or replace function on_note_restore()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is null and old.deleted_at is not null then
    -- Clean up dismissed conflicts where the other note is still deleted
    delete from conflicts c
    where (c.note_a_id = new.id or c.note_b_id = new.id)
      and c.status = 'dismissed'
      and exists (
        select 1 from notes n
        where n.id = case when c.note_a_id = new.id then c.note_b_id else c.note_a_id end
          and n.deleted_at is not null
      );
  end if;
  return new;
end;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger notes_updated_at
  before update on notes
  for each row execute function update_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create trigger on_note_soft_delete
  after update on notes
  for each row execute function on_note_soft_delete();

create trigger on_note_restore
  after update on notes
  for each row execute function on_note_restore();

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Semantic search across notes
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
set search_path = public, extensions
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

comment on function search_notes is 'Semantic search: finds notes similar to query embedding';

-- Hybrid search combining full-text search with semantic vector search
-- Uses Reciprocal Rank Fusion (RRF) to merge results from both methods
create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int default 10,
  full_text_weight float default 1.0,
  semantic_weight float default 1.0,
  rrf_k int default 50
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
    where n.user_id = auth.uid()
      and n.deleted_at is null
      and n.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank_cd(n.fts, websearch_to_tsquery('english', query_text)) desc
    limit match_count * 2
  ),
  semantic as (
    select 
      n.id,
      n.title,
      n.problem,
      n.content,
      substring(n.content, 1, 150) as snippet,
      row_number() over (order by n.embedding <=> query_embedding) as rank_ix
    from notes n
    where n.user_id = auth.uid()
      and n.deleted_at is null
      and n.embedding is not null
    order by n.embedding <=> query_embedding
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

comment on function hybrid_search is 'Hybrid search combining full-text keyword search with semantic vector search using Reciprocal Rank Fusion (RRF)';

-- Find related notes by semantic similarity
-- Filters by minimum similarity threshold to avoid showing unrelated notes
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
    and 1 - (n.embedding <=> target.embedding) >= match_threshold
  order by n.embedding <=> target.embedding
  limit match_count;
$$;

comment on function get_related_notes is 'Returns notes semantically similar to a target note, filtered by minimum similarity threshold';

-- Get backlinks for a note
-- Note: Parameter prefixed with p_ to avoid collision with column name nl.target_note_id
create or replace function get_backlinks(
  p_target_note_id uuid
)
returns table (
  id uuid,
  title text,
  problem text
)
language sql stable
security invoker
set search_path = public
as $$
  select n.id, n.title, n.problem
  from note_links nl
  join notes n on n.id = nl.source_note_id
  where nl.target_note_id = p_target_note_id
    and nl.user_id = auth.uid()
    and n.deleted_at is null
  order by n.updated_at desc;
$$;

comment on function get_backlinks is 'Returns notes that link to the target note (backlinks)';

-- ============================================================================
-- CONFLICT DETECTION FUNCTIONS
-- ============================================================================

-- Find potential conflicts for a note
-- Only excludes pairs with DISMISSED conflicts (allows re-detection after deletion)
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
    -- Only skip pairs with DISMISSED conflicts (allow re-detection otherwise)
    and not exists (
      select 1 from conflicts c
      where c.note_a_id = least(n.id, target_note_id)
        and c.note_b_id = greatest(n.id, target_note_id)
        and c.status = 'dismissed'
    )
  order by n.embedding <=> target.embedding
  limit match_count;
$$;

comment on function find_potential_conflicts is 'Finds semantically similar notes for conflict detection (skips dismissed pairs)';

-- Get count of active conflicts (excludes soft-deleted notes)
create or replace function get_unresolved_conflict_count()
returns integer
language sql stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from conflicts c
  join notes na on c.note_a_id = na.id
  join notes nb on c.note_b_id = nb.id
  where c.user_id = auth.uid()
    and c.status = 'active'
    and na.deleted_at is null
    and nb.deleted_at is null;
$$;

comment on function get_unresolved_conflict_count is 'Returns count of active conflicts for sidebar badge';

-- ============================================================================
-- TAG FUNCTIONS
-- ============================================================================

-- Get notes by tags (any of the specified tags)
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
set search_path = public
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
    and n.tags && filter_tags
    and (include_deleted or n.deleted_at is null)
  order by n.is_pinned desc, n.updated_at desc;
$$;

comment on function get_notes_by_tags is 'Returns notes that have any of the specified tags';

-- Get all unique tags with usage count
create or replace function get_all_tags()
returns table (tag text, count bigint)
language sql stable
security invoker
set search_path = public
as $$
  select unnest(tags) as tag, count(*) as count
  from notes
  where user_id = auth.uid()
    and deleted_at is null
  group by tag
  order by count desc, tag;
$$;

comment on function get_all_tags is 'Returns all unique tags with usage count for the current user';
