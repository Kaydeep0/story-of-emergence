-- ============================================================================
-- Story of Emergence: revoke_share RPC function
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- revoke_share: mark a share as revoked by its id
CREATE OR REPLACE FUNCTION revoke_share(
  p_owner_wallet text,
  p_share_id     uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the owner
  IF lower(p_owner_wallet) <> get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  UPDATE shares
  SET revoked_at = now()
  WHERE id = p_share_id
    AND lower(owner_wallet) = lower(p_owner_wallet);
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_share(text, uuid) TO anon, authenticated;

