-- ============================================================================
-- Story of Emergence: shares and accepted_shares tables for Phase Two
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the shares table (stores shared slices)
-- ----------------------------------------------------------------------------


  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_wallet    text           NOT NULL,
  recipient_wallet text           NOT NULL,
  slice_kind       text           NOT NULL,
  title            text           NOT NULL,
  ciphertext       text           NOT NULL,  -- AES-GCM encrypted with content key
  expires_at       timestamptz    NULL,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- Indexes for querying shares
CREATE INDEX IF NOT EXISTS idx_shares_sender 
  ON shares (sender_wallet);

CREATE INDEX IF NOT EXISTS idx_shares_recipient 
  ON shares (recipient_wallet);

-- 2. Create the accepted_shares table (recipient's accepted shares, re-encrypted)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accepted_shares (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   text           NOT NULL,
  share_id         uuid           NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  slice_kind       text           NOT NULL,
  title            text           NOT NULL,
  ciphertext       text           NOT NULL,  -- re-encrypted under recipient's key
  source_label     text           NOT NULL,
  received_at      timestamptz    NOT NULL DEFAULT now(),
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- Indexes for accepted shares
CREATE INDEX IF NOT EXISTS idx_accepted_shares_wallet 
  ON accepted_shares (wallet_address);

CREATE INDEX IF NOT EXISTS idx_accepted_shares_wallet_received 
  ON accepted_shares (wallet_address, received_at DESC);

-- 3. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE accepted_shares ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for shares
-- ----------------------------------------------------------------------------

-- SELECT: sender can see shares they sent, recipient can see shares they received
CREATE POLICY shares_select_policy ON shares
  FOR SELECT
  USING (
    lower(sender_wallet) = get_wallet_from_header() OR
    lower(recipient_wallet) = get_wallet_from_header()
  );

-- INSERT: sender can only insert shares from their own wallet
CREATE POLICY shares_insert_policy ON shares
  FOR INSERT
  WITH CHECK (lower(sender_wallet) = get_wallet_from_header());

-- DELETE: only sender can delete shares they created
CREATE POLICY shares_delete_policy ON shares
  FOR DELETE
  USING (lower(sender_wallet) = get_wallet_from_header());

-- 5. RLS Policies for accepted_shares
-- ----------------------------------------------------------------------------

-- SELECT: wallet can only see their own accepted shares
CREATE POLICY accepted_shares_select_policy ON accepted_shares
  FOR SELECT
  USING (lower(wallet_address) = get_wallet_from_header());

-- INSERT: wallet can only insert into their own accepted shares
CREATE POLICY accepted_shares_insert_policy ON accepted_shares
  FOR INSERT
  WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- DELETE: wallet can only delete their own accepted shares
CREATE POLICY accepted_shares_delete_policy ON accepted_shares
  FOR DELETE
  USING (lower(wallet_address) = get_wallet_from_header());

-- 6. RPC Functions
-- ----------------------------------------------------------------------------

-- get_share: Fetch a share by ID (for capsule opening)
-- Only returns if the requester is the recipient
CREATE OR REPLACE FUNCTION get_share(
  share_id uuid
)
RETURNS shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row shares;
BEGIN
  SELECT * INTO v_row
  FROM shares
  WHERE id = share_id
    AND lower(recipient_wallet) = get_wallet_from_header();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found or not authorized';
  END IF;
  
  RETURN v_row;
END;
$$;

-- insert_share: Create a new share
CREATE OR REPLACE FUNCTION insert_share(
  p_sender_wallet    text,
  p_recipient_wallet text,
  p_slice_kind       text,
  p_title            text,
  p_ciphertext       text,
  p_expires_at       timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Verify caller is the sender
  IF lower(p_sender_wallet) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  INSERT INTO shares (sender_wallet, recipient_wallet, slice_kind, title, ciphertext, expires_at)
  VALUES (lower(p_sender_wallet), lower(p_recipient_wallet), p_slice_kind, p_title, p_ciphertext, p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- insert_accepted_share: Accept a share and store re-encrypted copy
CREATE OR REPLACE FUNCTION insert_accepted_share(
  p_wallet      text,
  p_share_id    uuid,
  p_slice_kind  text,
  p_title       text,
  p_ciphertext  text,
  p_source_label text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Verify caller matches the wallet
  IF lower(p_wallet) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  INSERT INTO accepted_shares (wallet_address, share_id, slice_kind, title, ciphertext, source_label)
  VALUES (lower(p_wallet), p_share_id, p_slice_kind, p_title, p_ciphertext, p_source_label)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- list_accepted_shares: List accepted shares for a wallet
CREATE OR REPLACE FUNCTION list_accepted_shares(
  w         text,
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS SETOF accepted_shares
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
  FROM accepted_shares
  WHERE lower(wallet_address) = lower(w)
  ORDER BY received_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- delete_accepted_share: Remove an accepted share
CREATE OR REPLACE FUNCTION delete_accepted_share(
  w         text,
  p_share_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller matches the wallet
  IF lower(w) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  DELETE FROM accepted_shares
  WHERE id = p_share_id
    AND lower(wallet_address) = lower(w);
END;
$$;

-- 7. Grant execute permissions
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_share(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_share(text, text, text, text, text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_accepted_share(text, uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_accepted_shares(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_accepted_share(text, uuid) TO anon, authenticated;

