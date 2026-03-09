-- Consolidated Functions Migration
-- All database functions and triggers for Refinery
-- Consolidates: original 002, 005 (chunk-based search), 006 (embedding status gating)

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

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

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

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

create or replace function on_note_restore()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is null and old.deleted_at is not null then
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
-- SEARCH FUNCTIONS (chunk-based, gated on embedding_status = 'completed')
-- ============================================================================

create or replace function hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536),
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
      and n.embedding_status = 'completed'
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
    where sc.chunk_rank = 1
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

comment on function hybrid_search is 'Hybrid search combining full-text keyword search with chunk-based semantic vector search using Reciprocal Rank Fusion (RRF). Uses note_chunks for full semantic coverage of long notes. Only searches notes with completed embeddings.';

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
      and exists (
        select 1 from notes
        where id = target_note_id
          and embedding_status = 'completed'
      )
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
    and n.embedding_status = 'completed'
  order by cm.max_similarity desc
  limit match_count;
$$;

comment on function get_related_notes is 'Returns notes semantically similar to a target note using chunk-level embeddings for better coverage of long documents. Only returns notes with completed embeddings.';

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
      and exists (
        select 1 from notes
        where id = target_note_id
          and embedding_status = 'completed'
      )
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
    and n.embedding_status = 'completed'
    and not exists (
      select 1 from conflicts c
      where c.note_a_id = least(n.id, target_note_id)
        and c.note_b_id = greatest(n.id, target_note_id)
        and c.status = 'dismissed'
    )
  order by cm.max_similarity desc
  limit match_count;
$$;

comment on function find_potential_conflicts is 'Finds semantically similar notes for conflict detection using chunk-level embeddings (skips dismissed pairs). Only searches notes with completed embeddings.';

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

create or replace function get_backlinks(p_target_note_id uuid)
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
    and nl.user_id = (select auth.uid())
    and n.deleted_at is null
  order by n.updated_at desc;
$$;

comment on function get_backlinks is 'Returns notes that link to the target note (backlinks)';

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
  where c.user_id = (select auth.uid())
    and c.status = 'active'
    and na.deleted_at is null
    and nb.deleted_at is null;
$$;

comment on function get_unresolved_conflict_count is 'Returns count of active conflicts for sidebar badge';

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
  updated_at timestamptz,
  word_count integer
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
    n.updated_at,
    n.word_count
  from notes n
  where n.user_id = (select auth.uid())
    and n.tags && filter_tags
    and (include_deleted or n.deleted_at is null)
  order by n.is_pinned desc, n.updated_at desc;
$$;

comment on function get_notes_by_tags is 'Returns notes that have any of the specified tags';

create or replace function get_all_tags()
returns table (tag text, count bigint)
language sql stable
security invoker
set search_path = public
as $$
  select unnest(tags) as tag, count(*) as count
  from notes
  where user_id = (select auth.uid())
    and deleted_at is null
  group by tag
  order by count desc, tag;
$$;

comment on function get_all_tags is 'Returns all unique tags with usage count for the current user';
