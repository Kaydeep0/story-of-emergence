-- ============================================================================
-- Story of Emergence: Create sources and entry_sources tables
-- Creates the canonical sources table and the bridge table linking to entries
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to get the wallet from request headers (if not already exists)
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

-- 1. Create the sources table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('youtube','book','article','podcast','note','link','file','other')),
  title text,
  author text,
  url text,
  external_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_user_wallet_idx ON public.sources (lower(user_wallet));
CREATE INDEX IF NOT EXISTS sources_kind_idx ON public.sources (kind);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY sources_select_own
ON public.sources
FOR SELECT
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY sources_insert_own
ON public.sources
FOR INSERT
TO anon, authenticated
WITH CHECK (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY sources_update_own
ON public.sources
FOR UPDATE
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header())
WITH CHECK (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY sources_delete_own
ON public.sources
FOR DELETE
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

-- 2. Create the entry_sources bridge table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entry_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet text NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, source_id)
);

CREATE INDEX IF NOT EXISTS entry_sources_user_wallet_idx ON public.entry_sources (lower(user_wallet));
CREATE INDEX IF NOT EXISTS entry_sources_entry_id_idx ON public.entry_sources (entry_id);
CREATE INDEX IF NOT EXISTS entry_sources_source_id_idx ON public.entry_sources (source_id);

ALTER TABLE public.entry_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY entry_sources_select_own
ON public.entry_sources
FOR SELECT
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY entry_sources_insert_own
ON public.entry_sources
FOR INSERT
TO anon, authenticated
WITH CHECK (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY entry_sources_delete_own
ON public.entry_sources
FOR DELETE
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

