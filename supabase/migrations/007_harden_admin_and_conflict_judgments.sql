-- Harden admin authorization and conflict judgment writes

-- `profiles` currently stores only authorization state (`role`) plus timestamps.
-- Removing the generic self-update path prevents users from promoting themselves.
drop policy if exists "Users can update their own profile" on profiles;

-- Recreate the admin update policy explicitly so the only remaining write path
-- for roles is admin-scoped.
drop policy if exists "admins_can_update_roles" on profiles;
create policy "admins_can_update_roles" on profiles
  for update to authenticated
  using (is_current_user_admin())
  with check (is_current_user_admin());

-- Conflict judgments are written by background workers using the service role.
-- Restrict INSERT to that database role and explicitly remove client write grants.
drop policy if exists "Service role can insert judgments" on conflict_judgments;
create policy "Service role can insert judgments"
  on conflict_judgments for insert to service_role
  with check (true);

revoke all on table public.conflict_judgments from anon;
revoke insert, update, delete on table public.conflict_judgments from authenticated;
grant select on table public.conflict_judgments to authenticated;
grant select, insert, update, delete on table public.conflict_judgments to service_role;
