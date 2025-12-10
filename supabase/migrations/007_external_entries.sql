-- ============================================================================
-- Story of Emergence: entries_external table for Phase Two external sources
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the entries_external table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entries_external (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   text           NOT NULL,
  kind             text           NOT NULL,                      -- 'youtube', 'article', 'book', 'note'
  source_id        text,                                          -- e.g. video ID, URL, ISBN
  title            text,
  snippet          text,                                          -- highlight or short excerpt
  captured_at      timestamptz    DEFAULT now(),
  created_at       timestamptz    DEFAULT now()
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_entries_external_wallet 
  ON entries_external (wallet_address);

CREATE INDEX IF NOT EXISTS idx_entries_external_wallet_captured_at 
  ON entries_external (wallet_address, captured_at DESC);

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE entries_external ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- ----------------------------------------------------------------------------

-- SELECT policy: wallet can only read their own rows
CREATE POLICY "external entries belong to user" ON entries_external
  FOR SELECT
  USING (lower(wallet_address) = get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own wallet_address
CREATE POLICY entries_external_insert_policy ON entries_external
  FOR INSERT
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- UPDATE policy: wallet can only update their own rows
CREATE POLICY entries_external_update_policy ON entries_external
  FOR UPDATE
  USING (lower(wallet_address) = get_wallet_from_header())
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY entries_external_delete_policy ON entries_external
  FOR DELETE
  USING (lower(wallet_address) = get_wallet_from_header());

-- 4. RPC Functions
-- ----------------------------------------------------------------------------

-- list_external_entries: Returns latest external entries ordered by captured_at desc
-- with pagination support
CREATE OR REPLACE FUNCTION list_external_entries(
  w         text,
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS SETOF entries_external
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller matches the wallet
  IF lower(w) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  RETURN QUERY
  SELECT *
  FROM entries_external
  WHERE lower(wallet_address) = lower(w)
  ORDER BY captured_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 5. Grant execute permissions to authenticated and anon roles
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION list_external_entries(text, integer, integer) TO anon, authenticated;
