// src/app/lib/externalSources.ts
// External sources utilities - Phase 5.1 (read-only ingestion prep)

import { getSupabaseForWallet } from './supabase';
import { aesGcmEncryptText, aesGcmDecryptText } from '../../lib/crypto';

export type ExternalSourceType = 'youtube' | 'book' | 'article' | 'conversation' | 'note';

export interface ExternalSourceMetadata {
  notes?: string;
  tags?: string[];
  [key: string]: unknown; // Allow additional metadata fields
}

export interface ExternalSourceRow {
  id: string;
  user_wallet: string;
  source_type: ExternalSourceType;
  title: string;
  author: string | null;
  url: string | null;
  occurred_at_year: number;
  metadata_ciphertext: string;
  created_at: string;
}

export interface ExternalSourceDecrypted {
  id: string;
  user_wallet: string;
  source_type: ExternalSourceType;
  title: string;
  author: string | null;
  url: string | null;
  occurred_at_year: number;
  metadata: ExternalSourceMetadata;
  created_at: string;
}

/**
 * Encrypt external source metadata
 */
export async function encryptExternalSource(
  sessionKey: CryptoKey,
  metadata: ExternalSourceMetadata
): Promise<string> {
  const text = JSON.stringify(metadata);
  // Returns "v1:<base64(iv||ciphertext+tag)>"
  return aesGcmEncryptText(sessionKey, text);
}

/**
 * Decrypt external source metadata
 */
export async function decryptExternalSource(
  sessionKey: CryptoKey,
  ciphertext: string
): Promise<ExternalSourceMetadata> {
  // New format first (v1: AES-GCM)
  if (ciphertext.startsWith('v1:')) {
    const plain = await aesGcmDecryptText(sessionKey, ciphertext);
    return JSON.parse(plain) as ExternalSourceMetadata;
  }
  
  // Legacy fallback: plain base64(JSON) - for compatibility
  try {
    const text = atob(ciphertext);
    return JSON.parse(text) as ExternalSourceMetadata;
  } catch {
    return {}; // Return empty metadata if decryption fails
  }
}

/**
 * Insert a new external source
 */
export async function insertExternalSource(
  wallet: string,
  sessionKey: CryptoKey,
  data: {
    source_type: ExternalSourceType;
    title: string;
    author?: string | null;
    url?: string | null;
    occurred_at_year: number;
    metadata?: ExternalSourceMetadata;
  }
): Promise<ExternalSourceRow> {
  const sb = getSupabaseForWallet(wallet);
  
  // Encrypt metadata
  const metadata_ciphertext = await encryptExternalSource(
    sessionKey,
    data.metadata || {}
  );
  
  const { data: row, error } = await sb
    .from('external_sources')
    .insert({
      user_wallet: wallet.toLowerCase(),
      source_type: data.source_type,
      title: data.title,
      author: data.author || null,
      url: data.url || null,
      occurred_at_year: data.occurred_at_year,
      metadata_ciphertext,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to insert external source: ${error.message}`);
  }
  
  return row as ExternalSourceRow;
}

/**
 * List external sources for a wallet
 */
export async function listExternalSources(
  wallet: string,
  sessionKey: CryptoKey,
  options?: {
    limit?: number;
    offset?: number;
    source_type?: ExternalSourceType;
  }
): Promise<ExternalSourceDecrypted[]> {
  const sb = getSupabaseForWallet(wallet);
  
  let query = sb
    .from('external_sources')
    .select('*')
    .eq('user_wallet', wallet.toLowerCase())
    .order('occurred_at_year', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (options?.source_type) {
    query = query.eq('source_type', options.source_type);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.offset(options.offset);
  }
  
  const { data: rows, error } = await query;
  
  if (error) {
    throw new Error(`Failed to list external sources: ${error.message}`);
  }
  
  if (!rows || rows.length === 0) {
    return [];
  }
  
  // Decrypt metadata for each source
  const decrypted = await Promise.all(
    rows.map(async (row) => {
      const metadata = await decryptExternalSource(
        sessionKey,
        row.metadata_ciphertext
      );
      
      return {
        id: row.id,
        user_wallet: row.user_wallet,
        source_type: row.source_type as ExternalSourceType,
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
 * Delete an external source
 */
export async function deleteExternalSource(
  wallet: string,
  sourceId: string
): Promise<void> {
  const sb = getSupabaseForWallet(wallet);
  
  const { error } = await sb
    .from('external_sources')
    .delete()
    .eq('id', sourceId)
    .eq('user_wallet', wallet.toLowerCase());
  
  if (error) {
    throw new Error(`Failed to delete external source: ${error.message}`);
  }
}

