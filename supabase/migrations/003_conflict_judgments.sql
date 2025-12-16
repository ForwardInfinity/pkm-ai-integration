-- Conflict Judgments Migration
-- Stores ALL LLM judgments (including "no conflict") for idempotency tracking
-- Prevents re-judging unchanged note pairs, saving API costs

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Judgment result enum - includes 'no_conflict' which doesn't exist in conflict_type
create type judgment_result as enum ('no_conflict', 'tension', 'contradiction');

-- ============================================================================
-- TABLES
-- ============================================================================

create table conflict_judgments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_a_id uuid not null references notes(id) on delete cascade,
  note_b_id uuid not null references notes(id) on delete cascade,
  pair_content_hash text not null,
  judgment_result judgment_result not null,
  confidence float not null check (confidence >= 0 and confidence <= 1),
  reasoning text not null,
  explanation text,
  model text not null,
  created_at timestamptz not null default now(),
  -- Canonical ordering constraint (same as conflicts table)
  constraint conflict_judgments_notes_order check (note_a_id < note_b_id),
  -- Idempotency: only one judgment per pair per content state
  constraint conflict_judgments_unique_pair unique (note_a_id, note_b_id, pair_content_hash)
);

comment on table conflict_judgments is 'Stores ALL LLM conflict judgments for idempotency - includes no_conflict results';
comment on column conflict_judgments.pair_content_hash is 'Hash of combined note contents - changes trigger re-judgment';
comment on column conflict_judgments.judgment_result is 'LLM verdict: no_conflict, tension, or contradiction';
comment on column conflict_judgments.confidence is 'LLM confidence score between 0 and 1';
comment on column conflict_judgments.reasoning is 'Internal reasoning from the LLM (for debugging)';
comment on column conflict_judgments.explanation is 'User-facing explanation (only for conflicts)';
comment on column conflict_judgments.model is 'Model identifier used for the judgment';

-- ============================================================================
-- INDEXES
-- ============================================================================

create index conflict_judgments_user_idx on conflict_judgments(user_id);
create index conflict_judgments_note_a_idx on conflict_judgments(note_a_id);
create index conflict_judgments_note_b_idx on conflict_judgments(note_b_id);
create index conflict_judgments_pair_hash_idx on conflict_judgments(note_a_id, note_b_id, pair_content_hash);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table conflict_judgments enable row level security;

-- Users can view their own judgments
create policy "Users can view their own judgments"
  on conflict_judgments for select
  using ((select auth.uid()) = user_id);

-- Service role can insert judgments (Inngest functions run with service role)
create policy "Service role can insert judgments"
  on conflict_judgments for insert
  with check (true);
