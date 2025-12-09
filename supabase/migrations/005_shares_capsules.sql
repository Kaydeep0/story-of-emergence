-- ============================================================================
-- Story of Emergence: shares table for encrypted capsules
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the shares table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shares (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet     text           NOT NULL,
  recipient_wallet text           NOT NULL,
  capsule          jsonb          NOT NULL,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  revoked_at       timestamptz    NULL
);

-- Indexes for querying shares
CREATE INDEX IF NOT EXISTS idx_shares_owner_wallet 
  ON shares (owner_wallet);

CREATE INDEX IF NOT EXISTS idx_shares_recipient_wallet 
  ON shares (recipient_wallet);

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- ----------------------------------------------------------------------------

-- Helper function to get the wallet from request headers (if not already exists)
-- This should already exist from previous migrations, but we'll create it if needed
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

-- SELECT policy for owners: owners can see their own shares
CREATE POLICY shares_owner_select_policy ON shares
  FOR SELECT
  USING (lower(owner_wallet) = get_wallet_from_header());

-- SELECT policy for recipients: recipients can see shares sent to them (if not revoked)
CREATE POLICY shares_recipient_select_policy ON shares
  FOR SELECT
  USING (
    lower(recipient_wallet) = get_wallet_from_header() 
    AND revoked_at IS NULL
  );

-- INSERT policy: owners can only insert shares from their own wallet
CREATE POLICY shares_owner_insert_policy ON shares
  FOR INSERT
  WITH CHECK (lower(owner_wallet) = get_wallet_from_header());

-- UPDATE policy: owners can only update their own shares
CREATE POLICY shares_owner_update_policy ON shares
  FOR UPDATE
  USING (lower(owner_wallet) = get_wallet_from_header())
  WITH CHECK (lower(owner_wallet) = get_wallet_from_header());

-- 4. RPC Functions
-- ----------------------------------------------------------------------------

-- list_shares_by_owner: List shares created by the owner
CREATE OR REPLACE FUNCTION list_shares_by_owner(
  w         text,
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS SETOF shares
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
  FROM shares
  WHERE lower(owner_wallet) = lower(w)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- list_shares_by_recipient: List shares received by the recipient (not revoked)
CREATE OR REPLACE FUNCTION list_shares_by_recipient(
  w         text,
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS SETOF shares
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
  FROM shares
  WHERE lower(recipient_wallet) = lower(w)
    AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- insert_share: Create a new share
CREATE OR REPLACE FUNCTION insert_share(
  p_owner_wallet     text,
  p_recipient_wallet text,
  p_capsule          jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Verify caller is the owner
  IF lower(p_owner_wallet) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  INSERT INTO shares (owner_wallet, recipient_wallet, capsule)
  VALUES (lower(p_owner_wallet), lower(p_recipient_wallet), p_capsule)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. Grant execute permissions
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION list_shares_by_owner(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_shares_by_recipient(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_share(text, text, jsonb) TO anon, authenticated;

