-- ============================================================================
-- Story of Emergence: reflection_link_bridges table for encrypted bridges between reflections
-- Reason edges live here. Similarity edges are candidates only.
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- 1. Create the reflection_link_bridges table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reflection_link_bridges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  from_reflection_id uuid NOT NULL,
  to_reflection_id uuid NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  alg text NOT NULL DEFAULT 'AES-GCM',
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate bridges
CREATE UNIQUE INDEX IF NOT EXISTS reflection_link_bridges_unique
ON public.reflection_link_bridges (wallet_address, from_reflection_id, to_reflection_id);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reflection_link_bridges_wallet 
  ON public.reflection_link_bridges (wallet_address);

CREATE INDEX IF NOT EXISTS idx_reflection_link_bridges_from 
  ON public.reflection_link_bridges (from_reflection_id);

CREATE INDEX IF NOT EXISTS idx_reflection_link_bridges_to 
  ON public.reflection_link_bridges (to_reflection_id);

CREATE INDEX IF NOT EXISTS idx_reflection_link_bridges_wallet_created 
  ON public.reflection_link_bridges (wallet_address, created_at DESC);

-- 2. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.reflection_link_bridges ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (using get_wallet_from_header() pattern)
-- ----------------------------------------------------------------------------

-- SELECT policy: wallet can only read their own bridges
CREATE POLICY "bridges_select_own"
ON public.reflection_link_bridges
FOR SELECT
TO anon, authenticated
USING (lower(wallet_address) = get_wallet_from_header());

-- INSERT policy: wallet can only insert bridges with their own wallet_address
CREATE POLICY "bridges_insert_own"
ON public.reflection_link_bridges
FOR INSERT
TO anon, authenticated
WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- UPDATE policy: wallet can only update their own bridges
CREATE POLICY "bridges_update_own"
ON public.reflection_link_bridges
FOR UPDATE
TO anon, authenticated
USING (lower(wallet_address) = get_wallet_from_header())
WITH CHECK (lower(wallet_address) = get_wallet_from_header());

-- DELETE policy: wallet can only delete their own bridges
CREATE POLICY "bridges_delete_own"
ON public.reflection_link_bridges
FOR DELETE
TO anon, authenticated
USING (lower(wallet_address) = get_wallet_from_header());

-- 4. Create RPC functions
-- ----------------------------------------------------------------------------

-- list_reflection_link_bridges: Returns bridges for a wallet with pagination
CREATE OR REPLACE FUNCTION public.list_reflection_link_bridges(
  w text,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
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
  WHERE lower(b.wallet_address) = lower(w)
  ORDER BY b.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.list_reflection_link_bridges(text, integer, integer) TO anon, authenticated;

