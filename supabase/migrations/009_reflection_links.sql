-- ============================================================================
-- Story of Emergence: reflection_links table for Phase One reflection → source links
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the reflection_links table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reflection_links (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   text           NOT NULL,
  reflection_id    uuid           NOT NULL,
  source_id        text           NOT NULL,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reflection_links_wallet 
  ON reflection_links (wallet_address);

CREATE INDEX IF NOT EXISTS idx_reflection_links_reflection_id 
  ON reflection_links (reflection_id);

CREATE INDEX IF NOT EXISTS idx_reflection_links_source_id 
  ON reflection_links (source_id);

CREATE INDEX IF NOT EXISTS idx_reflection_links_wallet_reflection 
  ON reflection_links (wallet_address, reflection_id);

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE reflection_links ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- ----------------------------------------------------------------------------

-- SELECT policy: wallet can only read their own rows
CREATE POLICY reflection_links_select_policy ON reflection_links
  FOR SELECT
  USING (lower(wallet_address) = get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own wallet_address
CREATE POLICY reflection_links_insert_policy ON reflection_links
  FOR INSERT
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- UPDATE policy: wallet can only update their own rows
CREATE POLICY reflection_links_update_policy ON reflection_links
  FOR UPDATE
  USING (lower(wallet_address) = get_wallet_from_header())
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY reflection_links_delete_policy ON reflection_links
  FOR DELETE
  USING (lower(wallet_address) = get_wallet_from_header());
