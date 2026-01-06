// src/app/lib/entrySources.ts
// Manual linking between entries and sources (Phase 5.2)

import { getSupabaseForWallet } from './supabase';
import type { SourceDecrypted } from './sources';

export interface EntrySourceLink {
  id: string;
  user_wallet: string;
  entry_id: string;
  source_id: string;
  note: string | null;
  created_at: string;
}

export interface EntrySourceLinkWithSource extends EntrySourceLink {
  source: SourceDecrypted;
}

/**
 * Link a source to an entry
 */
export async function linkSourceToEntry(
  wallet: string,
  entryId: string,
  sourceId: string,
  note?: string
): Promise<EntrySourceLink> {
  const sb = getSupabaseForWallet(wallet);
  
  const { data: row, error } = await sb
    .from('entry_sources')
    .insert({
      user_wallet: wallet.toLowerCase(),
      entry_id: entryId,
      source_id: sourceId,
      note: note || null,
    })
    .select()
    .single();
  
  if (error) {
    // If it's a unique constraint violation, the link already exists
    if (error.code === '23505') {
      // Fetch the existing link
      const { data: existing } = await sb
        .from('entry_sources')
        .select('*')
        .eq('user_wallet', wallet.toLowerCase())
        .eq('entry_id', entryId)
        .eq('source_id', sourceId)
        .single();
      
      if (existing) {
        return existing as EntrySourceLink;
      }
    }
    throw new Error(`Failed to link source to entry: ${error.message}`);
  }
  
  return row as EntrySourceLink;
}

/**
 * Unlink a source from an entry
 */
export async function unlinkSourceFromEntry(
  wallet: string,
  entryId: string,
  sourceId: string
): Promise<void> {
  const sb = getSupabaseForWallet(wallet);
  
  const { error } = await sb
    .from('entry_sources')
    .delete()
    .eq('user_wallet', wallet.toLowerCase())
    .eq('entry_id', entryId)
    .eq('source_id', sourceId);
  
  if (error) {
    throw new Error(`Failed to unlink source from entry: ${error.message}`);
  }
}

/**
 * List all sources linked to an entry
 */
export async function listSourcesForEntry(
  wallet: string,
  entryId: string,
  sessionKey: CryptoKey
): Promise<SourceDecrypted[]> {
  const sb = getSupabaseForWallet(wallet);
  
  // Get all links for this entry
  const { data: links, error: linksError } = await sb
    .from('entry_sources')
    .select('source_id')
    .eq('user_wallet', wallet.toLowerCase())
    .eq('entry_id', entryId);
  
  if (linksError) {
    throw new Error(`Failed to list sources for entry: ${linksError.message}`);
  }
  
  if (!links || links.length === 0) {
    return [];
  }
  
  // Get the actual sources
  const sourceIds = links.map(link => link.source_id);
  const { data: sources, error: sourcesError } = await sb
    .from('sources')
    .select('*')
    .eq('user_wallet', wallet.toLowerCase())
    .in('id', sourceIds);
  
  if (sourcesError) {
    throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
  }
  
  if (!sources || sources.length === 0) {
    return [];
  }
  
  // Decrypt metadata for each source
  const { decryptSourceMetadata } = await import('./sources');
  const decrypted = await Promise.all(
    sources.map(async (row) => {
      const metadata = await decryptSourceMetadata(sessionKey, row.metadata);
      
      return {
        id: row.id,
        user_wallet: row.user_wallet,
        kind: row.kind as any,
        title: row.title,
        author: row.author,
        url: row.url,
        external_id: row.external_id,
        metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as SourceDecrypted;
    })
  );
  
  return decrypted;
}

/**
 * List all entries linked to a source
 */
export async function listEntriesForSource(
  wallet: string,
  sourceId: string
): Promise<string[]> {
  const sb = getSupabaseForWallet(wallet);
  
  const { data: links, error } = await sb
    .from('entry_sources')
    .select('entry_id')
    .eq('user_wallet', wallet.toLowerCase())
    .eq('source_id', sourceId);
  
  if (error) {
    throw new Error(`Failed to list entries for source: ${error.message}`);
  }
  
  if (!links || links.length === 0) {
    return [];
  }
  
  return links.map(link => link.entry_id);
}

