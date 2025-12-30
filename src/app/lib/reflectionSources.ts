// src/app/lib/reflectionSources.ts
// Manual linking between reflections and external sources (Phase 5.2)

import { getSupabaseForWallet } from './supabase';
import type { ExternalSourceDecrypted } from './externalSources';

export interface ReflectionSourceLink {
  id: string;
  user_wallet: string;
  reflection_id: string;
  source_id: string;
  created_at: string;
}

export interface ReflectionSourceLinkWithSource extends ReflectionSourceLink {
  source: ExternalSourceDecrypted;
}

/**
 * Link an external source to a reflection
 */
export async function linkSourceToReflection(
  wallet: string,
  reflectionId: string,
  sourceId: string
): Promise<ReflectionSourceLink> {
  const sb = getSupabaseForWallet(wallet);
  
  const { data: row, error } = await sb
    .from('reflection_sources')
    .insert({
      user_wallet: wallet.toLowerCase(),
      reflection_id: reflectionId,
      source_id: sourceId,
    })
    .select()
    .single();
  
  if (error) {
    // If it's a unique constraint violation, the link already exists
    if (error.code === '23505') {
      // Fetch the existing link
      const { data: existing } = await sb
        .from('reflection_sources')
        .select('*')
        .eq('user_wallet', wallet.toLowerCase())
        .eq('reflection_id', reflectionId)
        .eq('source_id', sourceId)
        .single();
      
      if (existing) {
        return existing as ReflectionSourceLink;
      }
    }
    throw new Error(`Failed to link source to reflection: ${error.message}`);
  }
  
  return row as ReflectionSourceLink;
}

/**
 * Unlink an external source from a reflection
 */
export async function unlinkSourceFromReflection(
  wallet: string,
  reflectionId: string,
  sourceId: string
): Promise<void> {
  const sb = getSupabaseForWallet(wallet);
  
  const { error } = await sb
    .from('reflection_sources')
    .delete()
    .eq('user_wallet', wallet.toLowerCase())
    .eq('reflection_id', reflectionId)
    .eq('source_id', sourceId);
  
  if (error) {
    throw new Error(`Failed to unlink source from reflection: ${error.message}`);
  }
}

/**
 * List all sources linked to a reflection
 */
export async function listSourcesForReflection(
  wallet: string,
  reflectionId: string,
  sessionKey: CryptoKey
): Promise<ExternalSourceDecrypted[]> {
  const sb = getSupabaseForWallet(wallet);
  
  // Get all links for this reflection
  const { data: links, error: linksError } = await sb
    .from('reflection_sources')
    .select('source_id')
    .eq('user_wallet', wallet.toLowerCase())
    .eq('reflection_id', reflectionId);
  
  if (linksError) {
    throw new Error(`Failed to list sources for reflection: ${linksError.message}`);
  }
  
  if (!links || links.length === 0) {
    return [];
  }
  
  // Get the actual sources
  const sourceIds = links.map(link => link.source_id);
  const { data: sources, error: sourcesError } = await sb
    .from('external_sources')
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
  const { decryptExternalSource } = await import('./externalSources');
  const decrypted = await Promise.all(
    sources.map(async (row) => {
      const metadata = await decryptExternalSource(sessionKey, row.metadata_ciphertext);
      
      return {
        id: row.id,
        user_wallet: row.user_wallet,
        source_type: row.source_type as any,
        title: row.title,
        author: row.author,
        url: row.url,
        occurred_at_year: row.occurred_at_year,
        metadata,
        created_at: row.created_at,
      } as ExternalSourceDecrypted;
    })
  );
  
  return decrypted;
}

/**
 * List all reflections linked to a source
 */
export async function listReflectionsForSource(
  wallet: string,
  sourceId: string
): Promise<string[]> {
  const sb = getSupabaseForWallet(wallet);
  
  const { data: links, error } = await sb
    .from('reflection_sources')
    .select('reflection_id')
    .eq('user_wallet', wallet.toLowerCase())
    .eq('source_id', sourceId);
  
  if (error) {
    throw new Error(`Failed to list reflections for source: ${error.message}`);
  }
  
  if (!links || links.length === 0) {
    return [];
  }
  
  return links.map(link => link.reflection_id);
}

