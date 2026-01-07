-- ============================================================================
-- Remove eth_encrypt dependency: drop wrapped_key from wallet_shares
-- Wallet shares now use app key encryption (encryptWithAppKey)
-- This migration is idempotent (safe to run multiple times)
-- ============================================================================

BEGIN;

-- 1. Drop wrapped_key column if it exists (idempotent)
ALTER TABLE public.wallet_shares
  DROP COLUMN IF EXISTS wrapped_key;

-- 2. Drop old function overloads that include wrapped_key (idempotent)
DROP FUNCTION IF EXISTS public.insert_wallet_share(text, text, text, text, text, timestamptz, text);

-- 3. Create/Replace insert_wallet_share RPC with new signature (no wrapped_key)
CREATE OR REPLACE FUNCTION public.insert_wallet_share(
  p_recipient_wallet text,
  p_kind             text,
  p_ciphertext       text,
  p_iv               text,
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

  INSERT INTO public.wallet_shares (
    created_by_wallet,
    recipient_wallet,
    kind,
    ciphertext,
    iv,
    expires_at,
    message
  )
  VALUES (
    lower(v_sender_wallet),
    lower(p_recipient_wallet),
    p_kind,
    p_ciphertext,
    p_iv,
    p_expires_at,
    p_message
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4. Update grants
GRANT EXECUTE ON FUNCTION public.insert_wallet_share(text, text, text, text, timestamptz, text) TO anon, authenticated;

-- 5. Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;


