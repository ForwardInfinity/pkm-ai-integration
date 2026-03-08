-- Content-scope conflict projections by pair hash
-- Ensures dismissed conflicts only suppress re-detection for the same content version

create extension if not exists pgcrypto with schema extensions;

create or replace function compute_pair_content_hash(
  note_a_id uuid,
  note_b_id uuid,
  note_a_hash text,
  note_b_hash text
)
returns text
language sql
immutable
strict
security invoker
set search_path = public, extensions
as $$
  select encode(
    digest(
      case
        when note_a_id < note_b_id then note_a_hash || ':' || note_b_hash
        else note_b_hash || ':' || note_a_hash
      end,
      'sha256'
    ),
    'hex'
  );
$$;

comment on function compute_pair_content_hash is 'Computes the canonical content hash for a note pair from each note''s embedding content hash.';

alter table conflicts
  add column if not exists pair_content_hash text;

comment on column conflicts.pair_content_hash is 'Hash of combined note contents for the judgment this conflict row currently projects.';

with latest_judgments as (
  select distinct on (note_a_id, note_b_id)
    note_a_id,
    note_b_id,
    pair_content_hash
  from conflict_judgments
  order by note_a_id, note_b_id, created_at desc, id desc
),
backfilled_hashes as (
  select
    c.id,
    coalesce(
      latest_judgments.pair_content_hash,
      compute_pair_content_hash(
        c.note_a_id,
        c.note_b_id,
        note_a.embedding_content_hash,
        note_b.embedding_content_hash
      ),
      'legacy:' || c.id::text
    ) as pair_content_hash
  from conflicts c
  left join latest_judgments
    on latest_judgments.note_a_id = c.note_a_id
   and latest_judgments.note_b_id = c.note_b_id
  left join notes note_a on note_a.id = c.note_a_id
  left join notes note_b on note_b.id = c.note_b_id
  where c.pair_content_hash is null
)
update conflicts c
set pair_content_hash = backfilled_hashes.pair_content_hash
from backfilled_hashes
where c.id = backfilled_hashes.id;

alter table conflicts
  alter column pair_content_hash set not null;

create index if not exists conflicts_pair_hash_idx
  on conflicts(note_a_id, note_b_id, pair_content_hash);

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
  with target_note_context as (
    select
      user_id,
      embedding_content_hash
    from notes
    where id = target_note_id
  ),
  target_chunks as (
    select embedding
    from note_chunks
    where note_id = target_note_id
      and exists (
        select 1
        from notes n
        join target_note_context tnc on true
        where n.id = target_note_id
          and n.embedding_status = 'completed'
          and tnc.embedding_content_hash is not null
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
      where nc_inner.user_id = (select user_id from target_note_context)
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
  join target_note_context tnc on true
  where n.deleted_at is null
    and n.embedding_status = 'completed'
    and n.embedding_content_hash is not null
    and not exists (
      select 1
      from conflicts c
      where c.note_a_id = least(n.id, target_note_id)
        and c.note_b_id = greatest(n.id, target_note_id)
        and c.status = 'dismissed'
        and c.pair_content_hash = compute_pair_content_hash(
          target_note_id,
          n.id,
          tnc.embedding_content_hash,
          n.embedding_content_hash
        )
    )
  order by cm.max_similarity desc
  limit match_count;
$$;

comment on function find_potential_conflicts is 'Finds semantically similar notes for conflict detection using chunk-level embeddings. Dismissed conflicts only suppress the current pair content hash.';
