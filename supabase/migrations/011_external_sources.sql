-- ============================================================================
-- Story of Emergence: external_sources table for Phase 5.1
-- Read-only ingestion prep - references only, no content processing
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the external_sources table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS external_sources (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet      text           NOT NULL,
  source_type       text           NOT NULL CHECK (source_type IN ('youtube', 'book', 'article', 'conversation', 'note')),
  title             text           NOT NULL,
  author            text           NULL,
  url               text           NULL,
  occurred_at_year  integer        NOT NULL,
  metadata_ciphertext text         NOT NULL,  -- AES-GCM encrypted metadata
  created_at        timestamptz    NOT NULL DEFAULT now()
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_external_sources_user_wallet 
  ON external_sources (user_wallet);

CREATE INDEX IF NOT EXISTS idx_external_sources_user_wallet_year 
  ON external_sources (user_wallet, occurred_at_year DESC);

CREATE INDEX IF NOT EXISTS idx_external_sources_user_wallet_type 
  ON external_sources (user_wallet, source_type);

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE external_sources ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY external_sources_select_policy ON external_sources
  FOR SELECT
  USING (lower(user_wallet) = get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own user_wallet
CREATE POLICY external_sources_insert_policy ON external_sources
  FOR INSERT
  WITH CHECK (lower(user_wallet) = get_wallet_from_header());

-- UPDATE policy: wallet can only update their own rows
CREATE POLICY external_sources_update_policy ON external_sources
  FOR UPDATE
  USING (lower(user_wallet) = get_wallet_from_header())
  WITH CHECK (lower(user_wallet) = get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY external_sources_delete_policy ON external_sources
  FOR DELETE
  USING (lower(user_wallet) = get_wallet_from_header());

