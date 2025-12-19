-- Admin policies and functions for user management

-- Simple function to check if current user is admin
-- Uses SECURITY DEFINER to bypass RLS
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

-- RLS policy: admins can view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (is_current_user_admin());

-- RLS policy: admins can update any profile's role
CREATE POLICY "admins_can_update_roles" ON profiles
  FOR UPDATE TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Function to get users with email (joins auth.users)
-- Uses SECURITY DEFINER to access auth.users which is not normally accessible
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (id uuid, email text, role user_role, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT p.id, u.email::text, p.role, p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;
