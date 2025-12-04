-- Migration 004: Optimize RLS Policies
-- Fixes performance issue where auth.uid() is re-evaluated for each row
-- Uses (select auth.uid()) pattern to evaluate once per query

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

-- Profiles policies
drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

-- Notes policies
drop policy if exists "Users can view their own notes" on notes;
drop policy if exists "Users can create their own notes" on notes;
drop policy if exists "Users can update their own notes" on notes;
drop policy if exists "Users can delete their own notes" on notes;

-- Conflicts policies
drop policy if exists "Users can view their own conflicts" on conflicts;
drop policy if exists "Users can create conflicts for their notes" on conflicts;
drop policy if exists "Users can update their own conflicts" on conflicts;
drop policy if exists "Users can delete their own conflicts" on conflicts;

-- Note links policies
drop policy if exists "Users can view their own note links" on note_links;
drop policy if exists "Users can create their own note links" on note_links;
drop policy if exists "Users can update their own note links" on note_links;
drop policy if exists "Users can delete their own note links" on note_links;

-- ============================================================================
-- RECREATE POLICIES WITH OPTIMIZED auth.uid() CALLS
-- Using (select auth.uid()) evaluates once per query instead of per row
-- ============================================================================

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

