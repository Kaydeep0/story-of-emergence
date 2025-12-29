-- ============================================================================
-- Story of Emergence: capsules table for encrypted Share Pack sharing
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- Create the capsules table
CREATE TABLE IF NOT EXISTS capsules (
  capsule_id        text           PRIMARY KEY,
  ciphertext        text           NOT NULL,
  wrapped_key       text           NOT NULL,
  recipient_pubkey  text           NOT NULL,
  checksum          text           NOT NULL,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  expires_at        timestamptz    NULL,
  sender_wallet     text           NOT NULL
);

-- Indexes for querying capsules
CREATE INDEX IF NOT EXISTS idx_capsules_recipient_pubkey 
  ON capsules (recipient_pubkey);

CREATE INDEX IF NOT EXISTS idx_capsules_sender_wallet 
  ON capsules (sender_wallet);

CREATE INDEX IF NOT EXISTS idx_capsules_checksum 
  ON capsules (checksum);

-- Enable Row Level Security
ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;

-- Helper function to get the wallet from request headers
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

-- RLS Policies

-- SELECT policy: recipients can read capsules sent to them (if not expired)
CREATE POLICY capsules_recipient_select_policy ON capsules
  FOR SELECT
  USING (
    lower(recipient_pubkey) = get_wallet_from_header()
    AND (expires_at IS NULL OR expires_at > now())
  );

-- SELECT policy: senders can read capsules they created
CREATE POLICY capsules_sender_select_policy ON capsules
  FOR SELECT
  USING (lower(sender_wallet) = get_wallet_from_header());

-- INSERT policy: only senders can insert capsules from their own wallet
CREATE POLICY capsules_sender_insert_policy ON capsules
  FOR INSERT
  WITH CHECK (lower(sender_wallet) = get_wallet_from_header());

-- DELETE policy: only senders can delete capsules they created (revocation)
CREATE POLICY capsules_sender_delete_policy ON capsules
  FOR DELETE
  USING (lower(sender_wallet) = get_wallet_from_header());

-- RPC Functions

-- get_capsule: Get a capsule by ID (recipient or sender can access)
CREATE OR REPLACE FUNCTION get_capsule(p_capsule_id text)
RETURNS TABLE (
  capsule_id text,
  ciphertext text,
  wrapped_key text,
  recipient_pubkey text,
  checksum text,
  created_at timestamptz,
  expires_at timestamptz,
  sender_wallet text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.capsule_id,
    c.ciphertext,
    c.wrapped_key,
    c.recipient_pubkey,
    c.checksum,
    c.created_at,
    c.expires_at,
    c.sender_wallet
  FROM capsules c
  WHERE c.capsule_id = p_capsule_id
    AND (
      -- Recipient can access if not expired
      (lower(c.recipient_pubkey) = get_wallet_from_header() AND (c.expires_at IS NULL OR c.expires_at > now()))
      OR
      -- Sender can always access
      (lower(c.sender_wallet) = get_wallet_from_header())
    );
END;
$$;

-- insert_capsule: Create a new capsule
CREATE OR REPLACE FUNCTION insert_capsule(
  p_capsule_id text,
  p_ciphertext text,
  p_wrapped_key text,
  p_recipient_pubkey text,
  p_checksum text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet text;
BEGIN
  -- Get sender wallet from header
  v_sender_wallet := get_wallet_from_header();
  
  IF v_sender_wallet IS NULL OR v_sender_wallet = '' THEN
    RAISE EXCEPTION 'Wallet address required';
  END IF;

  INSERT INTO capsules (
    capsule_id,
    ciphertext,
    wrapped_key,
    recipient_pubkey,
    checksum,
    expires_at,
    sender_wallet
  )
  VALUES (
    p_capsule_id,
    p_ciphertext,
    p_wrapped_key,
    lower(p_recipient_pubkey),
    p_checksum,
    p_expires_at,
    lower(v_sender_wallet)
  )
  RETURNING capsule_id INTO p_capsule_id;

  RETURN p_capsule_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_capsule(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_capsule(text, text, text, text, text, timestamptz) TO anon, authenticated;

