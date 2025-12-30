-- ============================================================================
-- Story of Emergence: reflection_sources table for Phase 5.2
-- Manual linking between reflections and external sources
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the reflection_sources join table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reflection_sources (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet      text           NOT NULL,
  reflection_id    uuid           NOT NULL,
  source_id        uuid           NOT NULL REFERENCES external_sources(id) ON DELETE CASCADE,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reflection_sources_user_wallet 
  ON reflection_sources (user_wallet);

CREATE INDEX IF NOT EXISTS idx_reflection_sources_reflection_id 
  ON reflection_sources (reflection_id);

CREATE INDEX IF NOT EXISTS idx_reflection_sources_source_id 
  ON reflection_sources (source_id);

CREATE INDEX IF NOT EXISTS idx_reflection_sources_wallet_reflection 
  ON reflection_sources (user_wallet, reflection_id);

-- Unique constraint: one reflection can link to the same source only once
CREATE UNIQUE INDEX IF NOT EXISTS idx_reflection_sources_unique_link 
  ON reflection_sources (user_wallet, reflection_id, source_id);

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE reflection_sources ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- ----------------------------------------------------------------------------

-- Helper function to get the wallet from request headers (if not already exists)
CREATE OR REPLACE FUNCTION get_wallet_from_header()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  ))
$$;

-- SELECT policy: wallet can only read their own rows
CREATE POLICY reflection_sources_select_policy ON reflection_sources
  FOR SELECT
  USING (lower(user_wallet) = get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own user_wallet
CREATE POLICY reflection_sources_insert_policy ON reflection_sources
  FOR INSERT
  WITH CHECK (lower(user_wallet) = get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY reflection_sources_delete_policy ON reflection_sources
  FOR DELETE
  USING (lower(user_wallet) = get_wallet_from_header());

