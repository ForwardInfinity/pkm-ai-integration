-- Check if current user is admin helper function
-- Note: This migration was applied via Supabase MCP (20251219124531_check_is_admin_function).
-- The function is also defined in 004_admin_policies.sql (CREATE OR REPLACE).
-- This file exists for migration history completeness.

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
