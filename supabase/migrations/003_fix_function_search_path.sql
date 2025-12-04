-- Migration 003: Fix Function Search Path
-- Sets search_path for all functions to prevent search_path injection attacks

-- Fix SQL functions with search_path set to public,extensions
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
  order by n.embedding <=> target.embedding
  limit match_count;
$$;

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
set search_path = public
as $$
  select n.id, n.title, n.problem
  from note_links nl
  join notes n on n.id = nl.source_note_id
  where nl.target_note_id = target_note_id
    and nl.user_id = auth.uid()
    and n.deleted_at is null
  order by n.updated_at desc;
$$;

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
    and not exists (
      select 1 from conflicts c
      where (c.note_a_id = least(n.id, target_note_id) and c.note_b_id = greatest(n.id, target_note_id))
    )
  order by n.embedding <=> target.embedding
  limit match_count;
$$;

create or replace function get_unresolved_conflict_count()
returns integer
language sql stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from conflicts
  where user_id = auth.uid()
    and status = 'unresolved';
$$;

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

-- Fix PL/pgSQL functions
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
  insert into profiles (id)
  values (new.id);
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
    update conflicts
    set status = 'resolved', resolved_at = now()
    where (note_a_id = new.id or note_b_id = new.id)
      and status = 'unresolved';
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
    update conflicts c
    set status = 'unresolved', resolved_at = null
    where (c.note_a_id = new.id or c.note_b_id = new.id)
      and c.status = 'resolved'
      and exists (
        select 1 from notes n
        where n.id = case when c.note_a_id = new.id then c.note_b_id else c.note_a_id end
          and n.deleted_at is null
      );
  end if;
  return new;
end;
$$;
