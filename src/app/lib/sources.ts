// src/app/lib/sources.ts
// Sources utilities - Phase 5.2

import { getSupabaseForWallet } from './supabase';
import { aesGcmEncryptText, aesGcmDecryptText } from '../../lib/crypto';

export type SourceKind = 'youtube' | 'book' | 'article' | 'podcast' | 'note' | 'link' | 'file' | 'other';

export interface SourceMetadata {
  notes?: string;
  tags?: string[];
  [key: string]: unknown; // Allow additional metadata fields
}

export interface SourceRow {
  id: string;
  user_wallet: string;
  kind: SourceKind;
  title: string | null;
  author: string | null;
  url: string | null;
  external_id: string | null;
  metadata: string; // JSON string (encrypted or plain)
  created_at: string;
  updated_at: string;
}

export interface SourceDecrypted {
  id: string;
  user_wallet: string;
  kind: SourceKind;
  title: string | null;
  author: string | null;
  url: string | null;
  external_id: string | null;
  metadata: SourceMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Encrypt source metadata
 */
export async function encryptSourceMetadata(
  sessionKey: CryptoKey,
  metadata: SourceMetadata
): Promise<string> {
  const text = JSON.stringify(metadata);
  // Returns "v1:<base64(iv||ciphertext+tag)>"
  return aesGcmEncryptText(sessionKey, text);
}

/**
 * Decrypt source metadata
 */
export async function decryptSourceMetadata(
  sessionKey: CryptoKey,
  metadataJson: string | Record<string, unknown>
): Promise<SourceMetadata> {
  // If it's already an object (from JSONB), return it
  if (typeof metadataJson === 'object' && metadataJson !== null && !('v1:' in metadataJson)) {
    return metadataJson as SourceMetadata;
  }
  
  // If it's a string, try to decrypt it
  const ciphertext = typeof metadataJson === 'string' ? metadataJson : JSON.stringify(metadataJson);
  
  // New format first (v1: AES-GCM)
  if (ciphertext.startsWith('v1:')) {
    const plain = await aesGcmDecryptText(sessionKey, ciphertext);
    return JSON.parse(plain) as SourceMetadata;
  }
  
  // Legacy fallback: plain base64(JSON) or plain JSON string
  try {
    // Try parsing as JSON first
    if (ciphertext.startsWith('{') || ciphertext.startsWith('[')) {
      return JSON.parse(ciphertext) as SourceMetadata;
    }
    // Try base64 decode
    const text = atob(ciphertext);
    return JSON.parse(text) as SourceMetadata;
  } catch {
    return {}; // Return empty metadata if decryption fails
  }
}

/**
 * Insert a new source
 */
export async function insertSource(
  wallet: string,
  sessionKey: CryptoKey,
  data: {
    kind: SourceKind;
    title?: string | null;
    author?: string | null;
    url?: string | null;
    external_id?: string | null;
    metadata?: SourceMetadata;
  }
): Promise<SourceRow> {
  const sb = getSupabaseForWallet(wallet);
  
  // Encrypt metadata
  const metadataJson = await encryptSourceMetadata(
    sessionKey,
    data.metadata || {}
  );
  
  const { data: row, error } = await sb
    .from('sources')
    .insert({
      user_wallet: wallet.toLowerCase(),
      kind: data.kind,
      title: data.title || null,
      author: data.author || null,
      url: data.url || null,
      external_id: data.external_id || null,
      metadata: metadataJson as any, // Store as JSONB
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to insert source: ${error.message}`);
  }
  
  return row as SourceRow;
}

/**
 * List sources for a wallet
 */
export async function listSources(
  wallet: string,
  sessionKey: CryptoKey,
  options?: {
    limit?: number;
    offset?: number;
    kind?: SourceKind;
  }
): Promise<SourceDecrypted[]> {
  const sb = getSupabaseForWallet(wallet);
  
  let query = sb
    .from('sources')
    .select('*')
    .eq('user_wallet', wallet.toLowerCase())
    .order('created_at', { ascending: false });
  
  if (options?.kind) {
    query = query.eq('kind', options.kind);
  }
  
  if (options?.limit != null) {
    const from = options.offset ?? 0;
    const to = from + options.limit - 1;
    query = query.range(from, to);
  }
  
  const { data: rows, error } = await query;
  
  if (error) {
    throw new Error(`Failed to list sources: ${error.message}`);
  }
  
  if (!rows || rows.length === 0) {
    return [];
  }
  
  // Decrypt metadata for each source
  const decrypted = await Promise.all(
    rows.map(async (row) => {
      const metadata = await decryptSourceMetadata(
        sessionKey,
        row.metadata as any
      );
      
      return {
        id: row.id,
        user_wallet: row.user_wallet,
        kind: row.kind as SourceKind,
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
 * Delete a source
 */
export async function deleteSource(
  wallet: string,
  sourceId: string
): Promise<void> {
  const sb = getSupabaseForWallet(wallet);
  
  const { error } = await sb
    .from('sources')
    .delete()
    .eq('id', sourceId)
    .eq('user_wallet', wallet.toLowerCase());
  
  if (error) {
    throw new Error(`Failed to delete source: ${error.message}`);
  }
}

/**
 * Update a source
 */
export async function updateSource(
  wallet: string,
  sourceId: string,
  sessionKey: CryptoKey,
  updates: {
    title?: string | null;
    author?: string | null;
    url?: string | null;
    external_id?: string | null;
    metadata?: SourceMetadata;
  }
): Promise<SourceRow> {
  const sb = getSupabaseForWallet(wallet);
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.author !== undefined) updateData.author = updates.author;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.external_id !== undefined) updateData.external_id = updates.external_id;
  if (updates.metadata !== undefined) {
    updateData.metadata = await encryptSourceMetadata(sessionKey, updates.metadata) as any;
  }
  
  const { data: row, error } = await sb
    .from('sources')
    .update(updateData)
    .eq('id', sourceId)
    .eq('user_wallet', wallet.toLowerCase())
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update source: ${error.message}`);
  }
  
  return row as SourceRow;
}
