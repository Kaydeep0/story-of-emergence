-- ============================================================================
-- Story of Emergence: derived_artifacts table for Pins feature
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the derived_artifacts table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS derived_artifacts (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   text           NOT NULL,
  kind             text           NOT NULL,                      -- 'cluster_pin' or 'thread_pin'
  scope            text           NOT NULL,                      -- e.g. 'mind_all', 'mind_7d', etc.
  ciphertext       text           NOT NULL,
  encryption_version integer      NOT NULL DEFAULT 1,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_derived_artifacts_wallet 
  ON derived_artifacts (wallet_address);

CREATE INDEX IF NOT EXISTS idx_derived_artifacts_wallet_kind 
  ON derived_artifacts (wallet_address, kind);

CREATE INDEX IF NOT EXISTS idx_derived_artifacts_wallet_created 
  ON derived_artifacts (wallet_address, created_at DESC);

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE derived_artifacts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- ----------------------------------------------------------------------------

-- SELECT policy: wallet can only read their own rows
CREATE POLICY derived_artifacts_select_policy ON derived_artifacts
  FOR SELECT
  USING (lower(wallet_address) = get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own wallet_address
CREATE POLICY derived_artifacts_insert_policy ON derived_artifacts
  FOR INSERT
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- UPDATE policy: wallet can only update their own rows
CREATE POLICY derived_artifacts_update_policy ON derived_artifacts
  FOR UPDATE
  USING (lower(wallet_address) = get_wallet_from_header())
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY derived_artifacts_delete_policy ON derived_artifacts
  FOR DELETE
  USING (lower(wallet_address) = get_wallet_from_header());

-- 4. Create RPC functions
-- ----------------------------------------------------------------------------

-- Insert derived artifact
CREATE OR REPLACE FUNCTION insert_derived_artifact(
  w text,
  p_kind text,
  p_scope text,
  p_ciphertext text,
  p_encryption_version integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  artifact_id uuid;
BEGIN
  INSERT INTO derived_artifacts (
    wallet_address,
    kind,
    scope,
    ciphertext,
    encryption_version
  ) VALUES (
    lower(w),
    p_kind,
    p_scope,
    p_ciphertext,
    p_encryption_version
  )
  RETURNING id INTO artifact_id;
  
  RETURN artifact_id;
END;
$$;

-- List derived artifacts by kind
CREATE OR REPLACE FUNCTION list_derived_artifacts(
  w text,
  p_kind text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  wallet_address text,
  kind text,
  scope text,
  ciphertext text,
  encryption_version integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.wallet_address,
    da.kind,
    da.scope,
    da.ciphertext,
    da.encryption_version,
    da.created_at,
    da.updated_at
  FROM derived_artifacts da
  WHERE lower(da.wallet_address) = lower(w)
    AND (p_kind IS NULL OR da.kind = p_kind)
  ORDER BY da.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update derived artifact ciphertext
CREATE OR REPLACE FUNCTION update_derived_artifact(
  w text,
  p_id uuid,
  p_ciphertext text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE derived_artifacts
  SET 
    ciphertext = p_ciphertext,
    updated_at = now()
  WHERE lower(wallet_address) = lower(w)
    AND id = p_id;
END;
$$;

-- Delete derived artifact
CREATE OR REPLACE FUNCTION delete_derived_artifact(
  w text,
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM derived_artifacts
  WHERE lower(wallet_address) = lower(w)
    AND id = p_id;
END;
$$;

