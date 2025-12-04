-- Migration 001: Foundation Schema
-- Creates core tables, types, indexes, RLS policies, and triggers for Refinery

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable pgvector for semantic embeddings (conflict detection, related notes, semantic search)
create extension if not exists vector with schema extensions;

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Conflict status enum for tracking conflict resolution state
create type conflict_status as enum ('unresolved', 'resolved', 'dismissed');

-- User role enum for admin dashboard access control
create type user_role as enum ('user', 'admin');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Profiles table (extends auth.users)
-- Stores user metadata not managed by Supabase Auth
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'User profiles extending Supabase Auth users';
comment on column profiles.role is 'User role for access control (user or admin)';

-- 2. Notes table (core entity)
-- The main table for storing user notes with epistemic context
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
comment on column notes.problem is 'The epistemic problem this note addresses (encouraged but not required)';
comment on column notes.embedding is 'Semantic embedding vector (1536 dims for text-embedding-3-small)';
comment on column notes.tags is 'User-defined tags for categorization';
comment on column notes.word_count is 'Content word count for analytics';
comment on column notes.deleted_at is 'Soft delete timestamp (NULL = active, non-NULL = in trash)';

-- 3. Conflicts table (detected contradictions)
-- Stores AI-detected conflicts between notes for resolution
create table conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_a_id uuid not null references notes(id) on delete cascade,
  note_b_id uuid not null references notes(id) on delete cascade,
  explanation text not null,
  status conflict_status not null default 'unresolved',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- Enforce note_a_id < note_b_id to prevent duplicate conflicts (A,B) and (B,A)
  constraint conflicts_notes_order check (note_a_id < note_b_id),
  -- Ensure unique conflict pairs
  constraint conflicts_unique_pair unique (note_a_id, note_b_id)
);

comment on table conflicts is 'AI-detected conflicts between notes for resolution';
comment on column conflicts.explanation is 'AI-generated explanation of why these notes conflict';
comment on column conflicts.status is 'Resolution status: unresolved, resolved, or dismissed';

-- 4. Note links table (backlinks tracking)
-- Tracks [[wikilink]] style references between notes
create table note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_note_id uuid not null references notes(id) on delete cascade,
  target_note_id uuid not null references notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Prevent duplicate links
  constraint note_links_unique_pair unique (source_note_id, target_note_id),
  -- Prevent self-links
  constraint note_links_no_self_link check (source_note_id != target_note_id)
);

comment on table note_links is 'Tracks wikilink references between notes for backlinks and graph visualization';
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

-- Tags index (GIN for array containment queries like @> and &&)
create index notes_tags_idx on notes using gin(tags);

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
-- ============================================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table notes enable row level security;
alter table conflicts enable row level security;
alter table note_links enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Notes policies
create policy "Users can view their own notes"
  on notes for select
  using (auth.uid() = user_id);

create policy "Users can create their own notes"
  on notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on notes for delete
  using (auth.uid() = user_id);

-- Conflicts policies
create policy "Users can view their own conflicts"
  on conflicts for select
  using (auth.uid() = user_id);

create policy "Users can create conflicts for their notes"
  on conflicts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conflicts"
  on conflicts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conflicts"
  on conflicts for delete
  using (auth.uid() = user_id);

-- Note links policies
create policy "Users can view their own note links"
  on note_links for select
  using (auth.uid() = user_id);

create policy "Users can create their own note links"
  on note_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own note links"
  on note_links for update
  using (auth.uid() = user_id);

create policy "Users can delete their own note links"
  on note_links for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger: Auto-update profiles.updated_at
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Trigger: Auto-update notes.updated_at
create trigger notes_updated_at
  before update on notes
  for each row execute function update_updated_at();

-- Function: Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Create profile when user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Function: Auto-resolve conflicts when note is soft-deleted
create or replace function on_note_soft_delete()
returns trigger as $$
begin
  -- If a note is being soft-deleted (deleted_at going from NULL to non-NULL)
  if new.deleted_at is not null and old.deleted_at is null then
    -- Mark all unresolved conflicts involving this note as resolved
    update conflicts
    set status = 'resolved', resolved_at = now()
    where (note_a_id = new.id or note_b_id = new.id)
      and status = 'unresolved';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Resolve conflicts when note is soft-deleted
create trigger on_note_soft_delete
  after update on notes
  for each row execute function on_note_soft_delete();

-- Function: Re-activate conflicts when note is restored from trash
create or replace function on_note_restore()
returns trigger as $$
begin
  -- If a note is being restored (deleted_at going from non-NULL to NULL)
  if new.deleted_at is null and old.deleted_at is not null then
    -- Mark resolved conflicts involving this note as unresolved again
    -- (only if the other note is also not deleted)
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
$$ language plpgsql security definer;

-- Trigger: Re-activate conflicts when note is restored
create trigger on_note_restore
  after update on notes
  for each row execute function on_note_restore();
