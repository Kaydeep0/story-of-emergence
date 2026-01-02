-- ============================================================================
-- Story of Emergence: wallet-based shares table (Option B: eth_getEncryptionPublicKey)
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create/update the wallet_shares table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_shares (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz    NOT NULL DEFAULT now(),
  created_by_wallet text          NOT NULL,
  recipient_wallet text           NOT NULL,
  kind             text           NOT NULL CHECK (kind IN ('weekly', 'summary', 'yearly')),
  ciphertext       text           NOT NULL,  -- AES-GCM encrypted artifact JSON
  iv               text           NOT NULL,  -- Base64 IV for ciphertext
  wrapped_key      text           NOT NULL,  -- Capsule key encrypted to recipient (eth_encrypt format)
  expires_at       timestamptz    NULL,
  revoked_at       timestamptz    NULL,
  version          text           NOT NULL DEFAULT 'v1',  -- Envelope version for upgrades
  message          text           NULL  -- Optional message from sender
);

-- Indexes for querying shares
CREATE INDEX IF NOT EXISTS idx_wallet_shares_created_by 
  ON wallet_shares (created_by_wallet);

CREATE INDEX IF NOT EXISTS idx_wallet_shares_recipient 
  ON wallet_shares (recipient_wallet);

CREATE INDEX IF NOT EXISTS idx_wallet_shares_recipient_active 
  ON wallet_shares (recipient_wallet, revoked_at) 
  WHERE revoked_at IS NULL;

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE wallet_shares ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- ----------------------------------------------------------------------------

-- Helper function to get the wallet from request headers (should already exist)
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

-- SELECT policy: creator can see shares they created, recipient can see shares sent to them (if not revoked)
CREATE POLICY wallet_shares_select_policy ON wallet_shares
  FOR SELECT
  USING (
    (lower(created_by_wallet) = get_wallet_from_header()) OR
    (lower(recipient_wallet) = get_wallet_from_header() AND revoked_at IS NULL)
  );

-- INSERT policy: creator can only insert shares from their own wallet
CREATE POLICY wallet_shares_insert_policy ON wallet_shares
  FOR INSERT
  WITH CHECK (lower(created_by_wallet) = get_wallet_from_header());

-- UPDATE policy: creator can only update their own shares (for revocation)
CREATE POLICY wallet_shares_update_policy ON wallet_shares
  FOR UPDATE
  USING (lower(created_by_wallet) = get_wallet_from_header())
  WITH CHECK (lower(created_by_wallet) = get_wallet_from_header());

-- 4. RPC Functions
-- ----------------------------------------------------------------------------

-- list_wallet_shares_sent: List shares created by the sender
CREATE OR REPLACE FUNCTION list_wallet_shares_sent(
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS SETOF wallet_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet text;
BEGIN
  v_wallet := get_wallet_from_header();
  
  IF v_wallet IS NULL OR v_wallet = '' THEN
    RAISE EXCEPTION 'Wallet address required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM wallet_shares
  WHERE lower(created_by_wallet) = v_wallet
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- list_wallet_shares_received: List shares received by the recipient (not revoked, not expired)
CREATE OR REPLACE FUNCTION list_wallet_shares_received(
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS SETOF wallet_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet text;
BEGIN
  v_wallet := get_wallet_from_header();
  
  IF v_wallet IS NULL OR v_wallet = '' THEN
    RAISE EXCEPTION 'Wallet address required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM wallet_shares
  WHERE lower(recipient_wallet) = v_wallet
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- get_wallet_share: Get a specific share by ID (only if recipient)
CREATE OR REPLACE FUNCTION get_wallet_share(
  p_share_id uuid
)
RETURNS wallet_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet text;
  v_share wallet_shares;
BEGIN
  v_wallet := get_wallet_from_header();
  
  IF v_wallet IS NULL OR v_wallet = '' THEN
    RAISE EXCEPTION 'Wallet address required';
  END IF;

  SELECT * INTO v_share
  FROM wallet_shares
  WHERE id = p_share_id
    AND lower(recipient_wallet) = v_wallet
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found or not authorized';
  END IF;
  
  RETURN v_share;
END;
$$;

-- insert_wallet_share: Create a new wallet share
CREATE OR REPLACE FUNCTION insert_wallet_share(
  p_recipient_wallet text,
  p_kind             text,
  p_ciphertext       text,
  p_iv               text,
  p_wrapped_key      text,
  p_expires_at       timestamptz DEFAULT NULL,
  p_message          text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet text;
  v_id uuid;
BEGIN
  v_sender_wallet := get_wallet_from_header();
  
  IF v_sender_wallet IS NULL OR v_sender_wallet = '' THEN
    RAISE EXCEPTION 'Wallet address required';
  END IF;

  -- Validate kind
  IF p_kind NOT IN ('weekly', 'summary', 'yearly') THEN
    RAISE EXCEPTION 'Invalid kind: must be weekly, summary, or yearly';
  END IF;

  INSERT INTO wallet_shares (
    created_by_wallet,
    recipient_wallet,
    kind,
    ciphertext,
    iv,
    wrapped_key,
    expires_at,
    message
  )
  VALUES (
    lower(v_sender_wallet),
    lower(p_recipient_wallet),
    p_kind,
    p_ciphertext,
    p_iv,
    p_wrapped_key,
    p_expires_at,
    p_message
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- revoke_wallet_share: Revoke a share (set revoked_at)
CREATE OR REPLACE FUNCTION revoke_wallet_share(
  p_share_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet text;
BEGIN
  v_sender_wallet := get_wallet_from_header();
  
  IF v_sender_wallet IS NULL OR v_sender_wallet = '' THEN
    RAISE EXCEPTION 'Wallet address required';
  END IF;

  UPDATE wallet_shares
  SET revoked_at = now()
  WHERE id = p_share_id
    AND lower(created_by_wallet) = v_sender_wallet
    AND revoked_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found or already revoked';
  END IF;
END;
$$;

-- 5. Grant execute permissions
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION list_wallet_shares_sent(integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_wallet_shares_received(integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_share(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_wallet_share(text, text, text, text, text, timestamptz, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION revoke_wallet_share(uuid) TO anon, authenticated;

