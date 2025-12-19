-- Admin Dashboard Statistics Functions
-- Provides aggregate statistics for the admin dashboard

-- Combined admin dashboard stats (single call for efficiency)
-- Returns all key metrics in one query
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  -- User stats
  total_users bigint,
  admin_count bigint,
  -- Notes stats
  total_notes bigint,
  active_notes bigint,
  total_word_count bigint,
  -- Conflict stats
  active_conflicts bigint,
  total_conflicts bigint,
  -- Embedding stats
  embedding_pending bigint,
  embedding_processing bigint,
  embedding_completed bigint,
  embedding_failed bigint,
  total_chunks bigint
)
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
  SELECT
    (SELECT count(*) FROM profiles)::bigint as total_users,
    (SELECT count(*) FROM profiles WHERE role = 'admin')::bigint as admin_count,
    (SELECT count(*) FROM notes)::bigint as total_notes,
    (SELECT count(*) FROM notes WHERE deleted_at IS NULL)::bigint as active_notes,
    (SELECT COALESCE(sum(word_count), 0) FROM notes WHERE deleted_at IS NULL)::bigint as total_word_count,
    (SELECT count(*) FROM conflicts WHERE status = 'active')::bigint as active_conflicts,
    (SELECT count(*) FROM conflicts)::bigint as total_conflicts,
    (SELECT count(*) FROM notes WHERE embedding_status = 'pending' AND deleted_at IS NULL)::bigint as embedding_pending,
    (SELECT count(*) FROM notes WHERE embedding_status = 'processing' AND deleted_at IS NULL)::bigint as embedding_processing,
    (SELECT count(*) FROM notes WHERE embedding_status = 'completed' AND deleted_at IS NULL)::bigint as embedding_completed,
    (SELECT count(*) FROM notes WHERE embedding_status = 'failed' AND deleted_at IS NULL)::bigint as embedding_failed,
    (SELECT count(*) FROM note_chunks)::bigint as total_chunks;
END;
$$;

-- Get detailed embedding stats with recent failures
-- Provides more detailed info for the system health section
CREATE OR REPLACE FUNCTION get_admin_embedding_details()
RETURNS TABLE (
  pending_count bigint,
  processing_count bigint,
  completed_count bigint,
  failed_count bigint,
  total_chunks bigint,
  recent_failures jsonb
)
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
  SELECT
    (SELECT count(*) FROM notes WHERE embedding_status = 'pending' AND deleted_at IS NULL)::bigint,
    (SELECT count(*) FROM notes WHERE embedding_status = 'processing' AND deleted_at IS NULL)::bigint,
    (SELECT count(*) FROM notes WHERE embedding_status = 'completed' AND deleted_at IS NULL)::bigint,
    (SELECT count(*) FROM notes WHERE embedding_status = 'failed' AND deleted_at IS NULL)::bigint,
    (SELECT count(*) FROM note_chunks)::bigint,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'title', n.title,
          'error', n.embedding_error,
          'failed_at', n.embedding_updated_at
        ) ORDER BY n.embedding_updated_at DESC
      ), '[]'::jsonb)
      FROM (
        SELECT id, title, embedding_error, embedding_updated_at
        FROM notes
        WHERE embedding_status = 'failed'
          AND deleted_at IS NULL
        ORDER BY embedding_updated_at DESC
        LIMIT 5
      ) n
    );
END;
$$;
