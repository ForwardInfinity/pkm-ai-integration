-- Migration 004: Graph Data Function
-- Returns data needed for Problem Graph visualization

-- Get all notes with their problems for graph visualization
create or replace function get_graph_notes()
returns table (
  id uuid,
  title text,
  problem text,
  is_pinned boolean,
  has_embedding boolean
)
language sql stable
security invoker
set search_path = public
as $$
  select
    n.id,
    n.title,
    n.problem,
    n.is_pinned,
    n.embedding is not null as has_embedding
  from notes n
  where n.user_id = auth.uid()
    and n.deleted_at is null
  order by n.is_pinned desc, n.updated_at desc;
$$;

comment on function get_graph_notes is 'Returns all notes for graph visualization';

-- Get all active conflicts for graph edges
create or replace function get_graph_conflicts()
returns table (
  id uuid,
  note_a_id uuid,
  note_b_id uuid,
  conflict_type text
)
language sql stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.note_a_id,
    c.note_b_id,
    c.conflict_type::text as conflict_type
  from conflicts c
  join notes na on c.note_a_id = na.id
  join notes nb on c.note_b_id = nb.id
  where c.user_id = auth.uid()
    and c.status = 'active'
    and na.deleted_at is null
    and nb.deleted_at is null;
$$;

comment on function get_graph_conflicts is 'Returns active conflicts for graph edges';
