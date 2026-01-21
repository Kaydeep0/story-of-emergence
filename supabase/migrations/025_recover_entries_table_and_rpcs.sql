-- ============================================================================
-- Recovery Migration: Entries Table and RPCs
-- This migration ensures the repo contains a complete definition of public.entries
-- and its canonical RPC surface, matching what the app expects.
-- ============================================================================
-- This is an idempotent recovery migration. It uses IF NOT EXISTS and CREATE OR REPLACE
-- to ensure the repo truth matches runtime truth without breaking existing databases.
-- ============================================================================

BEGIN;

-- Ensure pgcrypto extension exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure get_wallet_from_header() function exists
CREATE OR REPLACE FUNCTION public.get_wallet_from_header()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  ))
$$;

-- 1. Create the entries table (if not exists)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- 2. Create indexes (if not exists)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_entries_wallet_address 
  ON public.entries (lower(wallet_address));

CREATE INDEX IF NOT EXISTS idx_entries_wallet_created_at 
  ON public.entries (lower(wallet_address), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_deleted_at 
  ON public.entries (deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- 3. Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (drop and recreate to ensure correctness)
-- ----------------------------------------------------------------------------

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS entries_select_policy ON public.entries;
DROP POLICY IF EXISTS entries_insert_policy ON public.entries;
DROP POLICY IF EXISTS entries_update_policy ON public.entries;
DROP POLICY IF EXISTS entries_delete_policy ON public.entries;

-- SELECT policy: wallet can only read their own rows
CREATE POLICY entries_select_policy ON public.entries
  FOR SELECT
  TO anon, authenticated
  USING (lower(wallet_address) = public.get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own wallet_address
CREATE POLICY entries_insert_policy ON public.entries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (lower(wallet_address) = public.get_wallet_from_header());

-- UPDATE policy: wallet can only update their own rows
CREATE POLICY entries_update_policy ON public.entries
  FOR UPDATE
  TO anon, authenticated
  USING (lower(wallet_address) = public.get_wallet_from_header())
  WITH CHECK (lower(wallet_address) = public.get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY entries_delete_policy ON public.entries
  FOR DELETE
  TO anon, authenticated
  USING (lower(wallet_address) = public.get_wallet_from_header());

-- 5. Canonical RPC Functions (CREATE OR REPLACE ensures correctness)
-- ----------------------------------------------------------------------------
-- These 5 functions are the complete, canonical RPC surface for entries:
--   - list_entries(w text, include_deleted boolean) -> SETOF entries
--   - insert_entry(w text, cipher text) -> uuid
--   - soft_delete_entry(w text, entry_id uuid) -> void
--   - restore_entry(w text, entry_id uuid) -> void
--   - delete_entry(w text, entry_id uuid) -> void
-- All functions are SECURITY DEFINER and validate wallet ownership via get_wallet_from_header()

-- list_entries: Returns entries ordered by created_at desc with optional deleted filter
CREATE OR REPLACE FUNCTION public.list_entries(
  w text,
  include_deleted boolean DEFAULT false
)
RETURNS SETOF public.entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller matches the wallet
  IF lower(w) <> public.get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  IF include_deleted THEN
    RETURN QUERY
    SELECT *
    FROM public.entries
    WHERE lower(wallet_address) = lower(w)
    ORDER BY created_at DESC;
  ELSE
    RETURN QUERY
    SELECT *
    FROM public.entries
    WHERE lower(wallet_address) = lower(w)
      AND deleted_at IS NULL
    ORDER BY created_at DESC;
  END IF;
END;
$$;

-- insert_entry: Insert a new entry
-- Returns the inserted entry id
CREATE OR REPLACE FUNCTION public.insert_entry(
  w text,
  cipher text
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
  IF lower(w) <> public.get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  INSERT INTO public.entries (wallet_address, ciphertext)
  VALUES (lower(w), cipher)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- soft_delete_entry: Soft delete an entry by setting deleted_at
CREATE OR REPLACE FUNCTION public.soft_delete_entry(
  w text,
  entry_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller matches the wallet
  IF lower(w) <> public.get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  UPDATE public.entries
  SET deleted_at = now()
  WHERE id = entry_id
    AND lower(wallet_address) = lower(w)
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found or already deleted';
  END IF;
END;
$$;

-- restore_entry: Restore a soft-deleted entry by clearing deleted_at
CREATE OR REPLACE FUNCTION public.restore_entry(
  w text,
  entry_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller matches the wallet
  IF lower(w) <> public.get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  UPDATE public.entries
  SET deleted_at = NULL
  WHERE id = entry_id
    AND lower(wallet_address) = lower(w)
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found or not deleted';
  END IF;
END;
$$;

-- delete_entry: Hard delete an entry (permanently remove)
-- NOTE: Signature matches app expectation: delete_entry(w text, entry_id uuid)
CREATE OR REPLACE FUNCTION public.delete_entry(
  w text,
  entry_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller matches the wallet
  IF lower(w) <> public.get_wallet_from_header() THEN
    RAISE EXCEPTION 'Wallet mismatch';
  END IF;

  DELETE FROM public.entries
  WHERE id = entry_id
    AND lower(wallet_address) = lower(w);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
END;
$$;

-- 6. Grant execute permissions to authenticated and anon roles
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.list_entries(text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_entry(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_entry(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_entry(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry(text, uuid) TO anon, authenticated;

-- 7. Refresh PostgREST schema cache
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
