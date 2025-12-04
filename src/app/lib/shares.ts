// src/app/lib/shares.ts
// Client-side functions for shares and accepted_shares tables

import { getSupabaseForWallet } from './supabase';
import { aesGcmEncryptText, aesGcmDecryptText } from '../../lib/crypto';
import type {
  ShareRow,
  AcceptedShareRow,
  AcceptedShare,
  SliceKind,
} from '../../lib/sharing';

// ----- safe stringify -----
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'function') return undefined;
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return undefined;
      seen.add(value);
    }
    return value;
  });
}

// ----- Encrypt/decrypt for re-encrypting accepted shares -----
async function encryptPayload(sessionKey: CryptoKey, obj: unknown): Promise<string> {
  const text = safeStringify(obj);
  return aesGcmEncryptText(sessionKey, text);
}

async function decryptPayload(sessionKey: CryptoKey, cipher: string): Promise<unknown> {
  if (cipher.startsWith('v1:')) {
    const plain = await aesGcmDecryptText(sessionKey, cipher);
    return JSON.parse(plain);
  }
  return { error: 'Unable to decrypt' };
}

// ----- RPC calls -----

/**
 * Fetch a share by ID (for capsule opening)
 * Only works if the caller is the recipient
 */
export async function rpcGetShare(
  wallet: string,
  shareId: string
): Promise<ShareRow | null> {
  const supabase = getSupabaseForWallet(wallet);
  
  const { data, error } = await supabase.rpc('get_share', {
    share_id: shareId,
  });
  
  if (error) {
    console.error('[rpcGetShare] Error:', error.message);
    return null;
  }
  
  return data as ShareRow | null;
}

/**
 * Create a new share (sender side)
 */
export async function rpcInsertShare(
  wallet: string,
  recipientWallet: string,
  sliceKind: SliceKind,
  title: string,
  ciphertext: string,
  expiresAt?: Date
): Promise<string> {
  const supabase = getSupabaseForWallet(wallet);
  
  const { data, error } = await supabase.rpc('insert_share', {
    p_sender_wallet: wallet.toLowerCase(),
    p_recipient_wallet: recipientWallet.toLowerCase(),
    p_slice_kind: sliceKind,
    p_title: title,
    p_ciphertext: ciphertext,
    p_expires_at: expiresAt?.toISOString() ?? null,
  });
  
  if (error) throw error;
  return data as string;
}

/**
 * Accept a share and store it re-encrypted under the user's key
 */
export async function rpcInsertAcceptedShare(
  wallet: string,
  sessionKey: CryptoKey,
  shareId: string,
  sliceKind: SliceKind,
  title: string,
  decryptedPayload: unknown,
  sourceLabel: string
): Promise<string> {
  const supabase = getSupabaseForWallet(wallet);
  
  // Re-encrypt under user's key
  const ciphertext = await encryptPayload(sessionKey, decryptedPayload);
  
  const { data, error } = await supabase.rpc('insert_accepted_share', {
    p_wallet: wallet.toLowerCase(),
    p_share_id: shareId,
    p_slice_kind: sliceKind,
    p_title: title,
    p_ciphertext: ciphertext,
    p_source_label: sourceLabel,
  });
  
  if (error) throw error;
  return data as string;
}

/**
 * List accepted shares with pagination
 */
export async function rpcListAcceptedShares(
  wallet: string,
  sessionKey: CryptoKey,
  opts: { limit?: number; offset?: number } = {}
): Promise<{ items: AcceptedShare[]; nextOffset: number | null }> {
  const { limit = 50, offset = 0 } = opts;
  const supabase = getSupabaseForWallet(wallet);
  
  const { data, error } = await supabase.rpc('list_accepted_shares', {
    w: wallet.toLowerCase(),
    p_limit: limit,
    p_offset: offset,
  });
  
  if (error) throw error;
  
  const rows = (data ?? []) as AcceptedShareRow[];
  
  const items: AcceptedShare[] = await Promise.all(
    rows.map(async (r) => {
      let decryptedPayload: unknown;
      try {
        decryptedPayload = await decryptPayload(sessionKey, r.ciphertext);
      } catch {
        decryptedPayload = { error: 'Unable to decrypt' };
      }
      return {
        id: r.id,
        receivedAt: r.received_at,
        sourceLabel: r.source_label,
        sliceKind: r.slice_kind as SliceKind,
        title: r.title,
        decryptedPayload,
      };
    })
  );
  
  const nextOffset = rows.length < limit ? null : offset + rows.length;
  return { items, nextOffset };
}

/**
 * Delete an accepted share
 */
export async function rpcDeleteAcceptedShare(
  wallet: string,
  shareId: string
): Promise<void> {
  const supabase = getSupabaseForWallet(wallet);
  
  const { error } = await supabase.rpc('delete_accepted_share', {
    w: wallet.toLowerCase(),
    p_share_id: shareId,
  });
  
  if (error) throw error;
}

