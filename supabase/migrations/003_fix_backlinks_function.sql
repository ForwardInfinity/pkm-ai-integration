-- Migration: Fix get_backlinks function parameter name collision
-- The parameter name 'target_note_id' conflicted with the column 'nl.target_note_id'
-- causing PostgreSQL to compare the column to itself (always true), returning all links
-- instead of just backlinks to the specified note.

-- Fix: Rename parameter to 'p_target_note_id' to avoid ambiguity with column names
-- Must drop first because PostgreSQL doesn't allow renaming parameters in-place

drop function if exists get_backlinks(uuid);

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
