// src/app/lib/supabase.ts
// SINGLETON SUPABASE CLIENT
// 
// This is the single source of truth for Supabase client creation in the browser.
// All client-side code MUST import from this file to prevent multiple GoTrueClient instances.
//
// Server-side API routes may create their own clients per-request (which is correct for SSR).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client cache: one Supabase client per wallet address (singleton pattern)
// This prevents multiple GoTrueClient instances in the browser
const clients = new Map<string, SupabaseClient>();

/**
 * Returns a Supabase client that always sends the caller's wallet
 * in the x-wallet-address header (lowercased).
 * 
 * Uses a singleton pattern to prevent multiple GoTrueClient instances
 * in the same browser context.
 * 
 * IMPORTANT: All client-side code must use this function. Do not create
 * Supabase clients directly with createClient() in client components.
 */
export function getSupabaseForWallet(wallet: string): SupabaseClient {
  const w = (wallet ?? '').toLowerCase();
  const cacheKey = w || '__no_wallet__';

  let client = clients.get(cacheKey);
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-wallet-address': w,
        },
      },
    });
    clients.set(cacheKey, client);
  }
  return client;
}
