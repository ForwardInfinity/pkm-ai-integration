-- Migration: Add similarity threshold to get_related_notes
-- Purpose: Filter out unrelated notes by requiring a minimum similarity score
-- Before: Returned top N notes regardless of actual similarity (showed unrelated notes)
-- After: Only returns notes meeting the minimum threshold (default 0.3)

-- Drop old function signature first
drop function if exists get_related_notes(uuid, int);

-- Add similarity threshold to get_related_notes to filter out unrelated notes
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
