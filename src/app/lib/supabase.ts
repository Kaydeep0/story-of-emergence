// src/app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Returns a Supabase client that always sends the caller's wallet
 * in the x-wallet-address header (lowercased).
 */
export function getSupabaseForWallet(wallet: string) {
  return createClient(url, anon, {
    global: {
      headers: {
        'x-wallet-address': (wallet ?? '').toLowerCase(),
      },
    },
  });
}
