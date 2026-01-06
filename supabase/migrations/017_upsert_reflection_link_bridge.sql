-- ============================================================================
-- Story of Emergence: upsert_reflection_link_bridge RPC function
-- Allows upserting a single narrative bridge with encryption envelope
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_reflection_link_bridge(
  w text,
  from_id uuid,
  to_id uuid,
  p_ciphertext text,
  p_iv text,
  p_version integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF lower(public.get_wallet_from_header()) <> lower(w) THEN
    RAISE EXCEPTION 'wallet mismatch';
  END IF;

  INSERT INTO public.reflection_link_bridges (
    wallet_address,
    from_reflection_id,
    to_reflection_id,
    ciphertext,
    iv,
    alg,
    version,
    updated_at
  )
  VALUES (
    lower(w),
    from_id,
    to_id,
    p_ciphertext,
    p_iv,
    'AES-GCM',
    p_version,
    now()
  )
  ON CONFLICT (wallet_address, from_reflection_id, to_reflection_id)
  DO UPDATE SET
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    alg = excluded.alg,
    version = excluded.version,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_reflection_link_bridge(
  text, uuid, uuid, text, text, integer
) TO anon, authenticated;

