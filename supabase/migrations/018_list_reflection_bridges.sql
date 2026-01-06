-- ============================================================================
-- Story of Emergence: list_reflection_bridges RPC function
-- Simplified version that relies on RLS to scope to current user
-- ============================================================================

-- Create simplified list function that relies on RLS
CREATE OR REPLACE FUNCTION public.list_reflection_bridges(
  p_limit int DEFAULT 200,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  wallet_address text,
  from_reflection_id uuid,
  to_reflection_id uuid,
  ciphertext text,
  iv text,
  alg text,
  version int,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    b.id,
    b.wallet_address,
    b.from_reflection_id,
    b.to_reflection_id,
    b.ciphertext,
    b.iv,
    b.alg,
    b.version,
    b.created_at,
    b.updated_at
  FROM public.reflection_link_bridges b
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant execute permissions to anon and authenticated roles
-- RLS policies on reflection_link_bridges table will automatically filter by wallet
GRANT EXECUTE ON FUNCTION public.list_reflection_bridges(int, int) TO anon, authenticated;

