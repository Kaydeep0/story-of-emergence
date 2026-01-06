-- ============================================================================
-- Story of Emergence: Ensure reflection_sources table exists in public schema
-- This migration ensures the table is created if it doesn't exist
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the reflection_sources table if it doesn't exist (explicit public schema)
CREATE TABLE IF NOT EXISTS public.reflection_sources (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet      text           NOT NULL,
  reflection_id    uuid           NOT NULL,
  source_id        uuid           NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- Add indexes for common query patterns (if not exists)
CREATE INDEX IF NOT EXISTS reflection_sources_wallet_reflection_idx
  ON public.reflection_sources (user_wallet, reflection_id);

CREATE INDEX IF NOT EXISTS reflection_sources_wallet_source_idx
  ON public.reflection_sources (user_wallet, source_id);

CREATE INDEX IF NOT EXISTS idx_reflection_sources_user_wallet 
  ON public.reflection_sources (user_wallet);

CREATE INDEX IF NOT EXISTS idx_reflection_sources_reflection_id 
  ON public.reflection_sources (reflection_id);

CREATE INDEX IF NOT EXISTS idx_reflection_sources_source_id 
  ON public.reflection_sources (source_id);

-- Unique constraint: one reflection can link to the same source only once
CREATE UNIQUE INDEX IF NOT EXISTS reflection_sources_unique_link
  ON public.reflection_sources (user_wallet, reflection_id, source_id);

-- Enable Row Level Security
ALTER TABLE public.reflection_sources ENABLE ROW LEVEL SECURITY;

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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS reflection_sources_select_policy ON public.reflection_sources;
DROP POLICY IF EXISTS reflection_sources_insert_policy ON public.reflection_sources;
DROP POLICY IF EXISTS reflection_sources_delete_policy ON public.reflection_sources;

-- SELECT policy: wallet can only read their own rows
CREATE POLICY reflection_sources_select_policy ON public.reflection_sources
  FOR SELECT
  TO anon, authenticated
  USING (lower(user_wallet) = public.get_wallet_from_header());

-- INSERT policy: wallet can only insert rows with their own user_wallet
CREATE POLICY reflection_sources_insert_policy ON public.reflection_sources
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (lower(user_wallet) = public.get_wallet_from_header());

-- DELETE policy: wallet can only delete their own rows
CREATE POLICY reflection_sources_delete_policy ON public.reflection_sources
  FOR DELETE
  TO anon, authenticated
  USING (lower(user_wallet) = public.get_wallet_from_header());

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

