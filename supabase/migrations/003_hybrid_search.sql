-- Migration 003: Hybrid Search
-- Adds full-text search capability and hybrid search function combining FTS with semantic search

-- ============================================================================
-- FULL-TEXT SEARCH COLUMN
-- ============================================================================

-- Add auto-generated tsvector column for full-text search
-- Combines title, problem, and content for comprehensive search
ALTER TABLE notes ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(problem, '') || ' ' || coalesce(content, ''))
  ) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS notes_fts_idx ON notes USING gin(fts);

-- ============================================================================
-- HYBRID SEARCH FUNCTION
-- ============================================================================

-- Hybrid search combining full-text search with semantic vector search
-- Uses Reciprocal Rank Fusion (RRF) to merge results from both methods
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  full_text_weight float DEFAULT 1.0,
  semantic_weight float DEFAULT 1.0,
  rrf_k int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  problem text,
  content text,
  snippet text,
  match_type text,
  rrf_score float
)
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH full_text AS (
    SELECT 
      n.id,
      n.title,
      n.problem,
      n.content,
      ts_headline(
        'english', 
        n.content, 
        websearch_to_tsquery('english', query_text),
        'MaxWords=25, MinWords=10, StartSel=**, StopSel=**'
      ) as snippet,
      row_number() OVER (
        ORDER BY ts_rank_cd(n.fts, websearch_to_tsquery('english', query_text)) DESC
      ) as rank_ix
    FROM notes n
    WHERE n.user_id = auth.uid()
      AND n.deleted_at IS NULL
      AND n.fts @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank_cd(n.fts, websearch_to_tsquery('english', query_text)) DESC
    LIMIT match_count * 2
  ),
  semantic AS (
    SELECT 
      n.id,
      n.title,
      n.problem,
      n.content,
      substring(n.content, 1, 150) as snippet,
      row_number() OVER (ORDER BY n.embedding <=> query_embedding) as rank_ix
    FROM notes n
    WHERE n.user_id = auth.uid()
      AND n.deleted_at IS NULL
      AND n.embedding IS NOT NULL
    ORDER BY n.embedding <=> query_embedding
    LIMIT match_count * 2
  )
  SELECT 
    COALESCE(ft.id, sem.id) as id,
    COALESCE(ft.title, sem.title) as title,
    COALESCE(ft.problem, sem.problem) as problem,
    COALESCE(ft.content, sem.content) as content,
    COALESCE(ft.snippet, sem.snippet) as snippet,
    CASE 
      WHEN ft.id IS NOT NULL AND sem.id IS NOT NULL THEN 'hybrid'
      WHEN ft.id IS NOT NULL THEN 'keyword'
      ELSE 'semantic'
    END as match_type,
    (COALESCE(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight +
     COALESCE(1.0 / (rrf_k + sem.rank_ix), 0.0) * semantic_weight) as rrf_score
  FROM full_text ft
  FULL OUTER JOIN semantic sem ON ft.id = sem.id
  ORDER BY 
    (COALESCE(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight +
     COALESCE(1.0 / (rrf_k + sem.rank_ix), 0.0) * semantic_weight) DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION hybrid_search IS 'Hybrid search combining full-text keyword search with semantic vector search using Reciprocal Rank Fusion (RRF)';
