-- ============================================================================
-- Story of Emergence: internal_events table for Phase One insight engine
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the internal_events table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internal_events (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   text           NOT NULL,
  event_at         timestamptz    NOT NULL,
  ciphertext       text           NOT NULL,
  encryption_version integer      NOT NULL DEFAULT 1,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_internal_events_wallet 
  ON internal_events (wallet_address);

CREATE INDEX IF NOT EXISTS idx_internal_events_wallet_event_at 
  ON internal_events (wallet_address, event_at DESC);


-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE internal_events ENABLE ROW LEVEL SECURITY;


-- 3. RLS Policies (same pattern as entries table)
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
CREATE POLICY internal_events_select_policy ON internal_events
  FOR SELECT
  USING (lower(wallet_address) = get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own wallet_address
CREATE POLICY internal_events_insert_policy ON internal_events
  FOR INSERT
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- UPDATE policy: wallet can only update their own rows
CREATE POLICY internal_events_update_policy ON internal_events
  FOR UPDATE
  USING (lower(wallet_address) = get_wallet_from_header())
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY internal_events_delete_policy ON internal_events
  FOR DELETE
  USING (lower(wallet_address) = get_wallet_from_header());


-- 4. RPC Functions
-- ----------------------------------------------------------------------------

-- insert_internal_event: Insert a new internal event
-- Returns the inserted row
CREATE OR REPLACE FUNCTION insert_internal_event(
  w              text,
  p_event_at     timestamptz,
  p_ciphertext   text,
  p_encryption_version integer DEFAULT 1
)
RETURNS internal_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row internal_events;
BEGIN
  -- Verify caller matches the wallet
  IF lower(w) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  INSERT INTO internal_events (wallet_address, event_at, ciphertext, encryption_version)
  VALUES (lower(w), p_event_at, p_ciphertext, p_encryption_version)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;


-- list_internal_events: Returns latest events ordered by event_at desc
-- with pagination support
CREATE OR REPLACE FUNCTION list_internal_events(
  w         text,
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS SETOF internal_events
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
  FROM internal_events
  WHERE lower(wallet_address) = lower(w)
  ORDER BY event_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- list_internal_events_by_range: Returns events within a time range
CREATE OR REPLACE FUNCTION list_internal_events_by_range(
  w        text,
  p_start  timestamptz,
  p_end    timestamptz
)
RETURNS SETOF internal_events
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
  FROM internal_events
  WHERE lower(wallet_address) = lower(w)
    AND event_at >= p_start
    AND event_at <= p_end
  ORDER BY event_at DESC;
END;
$$;


-- 5. Grant execute permissions to authenticated and anon roles
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION insert_internal_event(text, timestamptz, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_internal_events(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_internal_events_by_range(text, timestamptz, timestamptz) TO anon, authenticated;

