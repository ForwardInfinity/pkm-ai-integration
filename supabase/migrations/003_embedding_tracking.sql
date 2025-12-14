-- Migration 003: Embedding Tracking
-- Add columns for idempotent embedding generation with content hashing

-- ============================================================================
-- ADD TRACKING COLUMNS
-- ============================================================================

-- Add embedding status tracking columns to notes table
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS embedding_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS embedding_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_content_hash text,
  ADD COLUMN IF NOT EXISTS embedding_error text,
  ADD COLUMN IF NOT EXISTS embedding_model text;

-- Add check constraint for valid status values
ALTER TABLE notes
  ADD CONSTRAINT notes_embedding_status_check
  CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add comment documentation
COMMENT ON COLUMN notes.embedding_status IS 'Status of embedding generation: pending, processing, completed, failed';
COMMENT ON COLUMN notes.embedding_requested_at IS 'Timestamp when embedding generation was requested';
COMMENT ON COLUMN notes.embedding_updated_at IS 'Timestamp when embedding was last successfully updated';
COMMENT ON COLUMN notes.embedding_content_hash IS 'SHA-256 hash of content used for current embedding (for idempotency)';
COMMENT ON COLUMN notes.embedding_error IS 'Error message if embedding generation failed';
COMMENT ON COLUMN notes.embedding_model IS 'Model identifier used to generate the embedding';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding notes by embedding status (per user)
CREATE INDEX IF NOT EXISTS notes_embedding_status_idx
  ON notes(user_id, embedding_status);

-- Index for reconciliation queries (finding stale pending/failed)
CREATE INDEX IF NOT EXISTS notes_embedding_requested_at_idx
  ON notes(embedding_requested_at)
  WHERE embedding_status IN ('pending', 'failed');

-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================

-- Set status to 'completed' for notes that already have embeddings
UPDATE notes
SET
  embedding_status = 'completed',
  embedding_updated_at = updated_at
WHERE embedding IS NOT NULL
  AND embedding_status = 'pending';

-- Notes without embeddings remain 'pending' (default)
