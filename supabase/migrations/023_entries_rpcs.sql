-- ============================================================================
-- Canonical entries RPC surface
-- This migration exists to make the Vault layer explicit and discoverable
-- ============================================================================
-- These 5 functions are the complete, canonical RPC surface for entries:
--   - list_entries(w text, include_deleted boolean) -> SETOF entries
--   - insert_entry(w text, cipher text) -> uuid
--   - soft_delete_entry(w text, entry_id uuid) -> void
--   - restore_entry(w text, entry_id uuid) -> void
--   - delete_entry(w text, entry_id uuid) -> void
-- All functions are SECURITY DEFINER and validate wallet ownership via get_wallet_from_header()
-- ============================================================================

BEGIN;

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

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.list_entries(text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_entry(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_entry(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_entry(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry(text, uuid) TO anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

