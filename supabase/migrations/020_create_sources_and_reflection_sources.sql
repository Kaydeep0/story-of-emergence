-- ============================================================================
-- Story of Emergence: Create sources and reflection_sources tables
-- Creates the canonical sources table and the bridge table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create the sources table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet text NOT NULL,
  kind text NOT NULL,
  title text,
  url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_wallet_idx
  ON public.sources (lower(user_wallet));

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY sources_select_policy
ON public.sources
FOR SELECT
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY sources_insert_policy
ON public.sources
FOR INSERT
TO anon, authenticated
WITH CHECK (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY sources_delete_policy
ON public.sources
FOR DELETE
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

-- 2. Create the reflection_sources bridge table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reflection_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid NOT NULL REFERENCES public.reflections(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  user_wallet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reflection_id, source_id)
);

CREATE INDEX IF NOT EXISTS reflection_sources_reflection_idx
  ON public.reflection_sources (reflection_id);

CREATE INDEX IF NOT EXISTS reflection_sources_source_idx
  ON public.reflection_sources (source_id);

CREATE INDEX IF NOT EXISTS reflection_sources_wallet_idx
  ON public.reflection_sources (lower(user_wallet));

ALTER TABLE public.reflection_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY reflection_sources_select_policy
ON public.reflection_sources
FOR SELECT
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY reflection_sources_insert_policy
ON public.reflection_sources
FOR INSERT
TO anon, authenticated
WITH CHECK (lower(user_wallet) = public.get_wallet_from_header());

CREATE POLICY reflection_sources_delete_policy
ON public.reflection_sources
FOR DELETE
TO anon, authenticated
USING (lower(user_wallet) = public.get_wallet_from_header());

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

