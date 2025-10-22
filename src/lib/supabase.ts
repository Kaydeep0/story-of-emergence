// src/app/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const clients = new Map<string, SupabaseClient>();

export function getSupabaseForWallet(addr: string): SupabaseClient {
  const w = (addr ?? '').toLowerCase();
  const cacheKey = w || '__no_wallet__';

  let sb = clients.get(cacheKey);
  if (!sb) {
    sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: w ? { 'x-wallet-address': w } : {},
      },
    });
    clients.set(cacheKey, sb);
  }
  return sb;
}
