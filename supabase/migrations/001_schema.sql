-- Migration 001: Schema
-- Core schema for Refinery: extensions, types, tables, indexes, and RLS policies

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable pgvector for semantic embeddings (conflict detection, related notes, semantic search)
create extension if not exists vector with schema extensions;

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Conflict status enum (simplified: active or dismissed)
-- 'active' = detected, needs attention
-- 'dismissed' = user said "not a real conflict", won't resurface for this pair
create type conflict_status as enum ('active', 'dismissed');

-- Conflict type enum for categorization
-- 'contradiction' = direct logical conflict (A says X, B says NOT X)
-- 'tension' = disagreement without direct contradiction
create type conflict_type as enum ('contradiction', 'tension');

-- User role enum for admin dashboard access control
create type user_role as enum ('user', 'admin');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'User profiles extending Supabase Auth users';
comment on column profiles.role is 'User role for access control (user or admin)';

-- 2. Notes table (core entity)
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  problem text,
  content text not null default '',
  embedding vector(1536),
  tags text[] not null default '{}',
  word_count integer not null default 0,
  is_pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table notes is 'User notes with epistemic context (problem field) and semantic embeddings';
comment on column notes.problem is 'The epistemic problem this note addresses';
comment on column notes.embedding is 'Semantic embedding vector (1536 dims for text-embedding-3-small)';
comment on column notes.tags is 'User-defined tags for categorization';
comment on column notes.word_count is 'Content word count for analytics';
comment on column notes.deleted_at is 'Soft delete timestamp (NULL = active, non-NULL = in trash)';

-- 3. Conflicts table (detected contradictions/tensions)
create table conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_a_id uuid not null references notes(id) on delete cascade,
  note_b_id uuid not null references notes(id) on delete cascade,
  explanation text not null,
  conflict_type conflict_type not null default 'contradiction',
  status conflict_status not null default 'active',
  created_at timestamptz not null default now(),
  -- Enforce note_a_id < note_b_id to prevent duplicate conflicts (A,B) and (B,A)
  constraint conflicts_notes_order check (note_a_id < note_b_id),
  -- Ensure unique conflict pairs
  constraint conflicts_unique_pair unique (note_a_id, note_b_id)
);

comment on table conflicts is 'AI-detected conflicts between notes for resolution';
comment on column conflicts.explanation is 'AI-generated explanation of why these notes conflict';
comment on column conflicts.conflict_type is 'Type: contradiction (direct) or tension (indirect)';
comment on column conflicts.status is 'Status: active (needs attention) or dismissed (user ignored)';

-- 4. Note links table (backlinks tracking)
create table note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_note_id uuid not null references notes(id) on delete cascade,
  target_note_id uuid not null references notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint note_links_unique_pair unique (source_note_id, target_note_id),
  constraint note_links_no_self_link check (source_note_id != target_note_id)
);

comment on table note_links is 'Tracks wikilink references between notes for backlinks and graph';
comment on column note_links.source_note_id is 'Note containing the link';
comment on column note_links.target_note_id is 'Note being linked to';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Notes indexes
create index notes_user_id_idx on notes(user_id);
create index notes_user_active_idx on notes(user_id, updated_at desc)
  where deleted_at is null;
create index notes_user_pinned_idx on notes(user_id, is_pinned)
  where is_pinned = true and deleted_at is null;
create index notes_deleted_at_idx on notes(deleted_at)
  where deleted_at is not null;
create index notes_tags_idx on notes using gin(tags);

-- HNSW index for fast approximate nearest neighbor search
create index notes_embedding_idx on notes
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Conflicts indexes
create index conflicts_user_status_idx on conflicts(user_id, status);
create index conflicts_note_a_idx on conflicts(note_a_id);
create index conflicts_note_b_idx on conflicts(note_b_id);

-- Note links indexes
create index note_links_source_idx on note_links(source_note_id);
create index note_links_target_idx on note_links(target_note_id);
create index note_links_user_idx on note_links(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Using (select auth.uid()) pattern for performance (evaluates once per query)
-- ============================================================================

alter table profiles enable row level security;
alter table notes enable row level security;
alter table conflicts enable row level security;
alter table note_links enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on profiles for update
  using ((select auth.uid()) = id);

-- Notes policies
create policy "Users can view their own notes"
  on notes for select
  using ((select auth.uid()) = user_id);

create policy "Users can create their own notes"
  on notes for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own notes"
  on notes for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own notes"
  on notes for delete
  using ((select auth.uid()) = user_id);

-- Conflicts policies
create policy "Users can view their own conflicts"
  on conflicts for select
  using ((select auth.uid()) = user_id);

create policy "Users can create conflicts for their notes"
  on conflicts for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own conflicts"
  on conflicts for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own conflicts"
  on conflicts for delete
  using ((select auth.uid()) = user_id);

-- Note links policies
create policy "Users can view their own note links"
  on note_links for select
  using ((select auth.uid()) = user_id);

create policy "Users can create their own note links"
  on note_links for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own note links"
  on note_links for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own note links"
  on note_links for delete
  using ((select auth.uid()) = user_id);
