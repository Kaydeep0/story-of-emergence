// src/app/lib/checkSourcesTable.ts
// Runtime check for sources table existence

import { getSupabaseForWallet } from './supabase';

/**
 * Check if the sources table exists by attempting a simple query
 * Returns true if table exists, false if missing
 */
export async function checkSourcesTableExists(wallet: string): Promise<boolean> {
  try {
    const sb = getSupabaseForWallet(wallet);
    // Try to query the sources table with a limit of 0 (just checking existence)
    const { error } = await sb
      .from('sources')
      .select('id', { count: 'exact', head: true })
      .limit(0);
    
    // If error code is 42P01 (undefined_table), table doesn't exist
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return false;
      }
      // Other errors might be permissions, but table exists
      // Return true to avoid false positives
      return true;
    }
    
    return true;
  } catch (err: any) {
    // If we get an error about table not existing, return false
    if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
      return false;
    }
    // For other errors, assume table exists (avoid false positives)
    return true;
  }
}

