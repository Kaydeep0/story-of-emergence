// src/lib/walletShares.ts
// API functions for creating and reading wallet-based shares

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShareArtifact } from './artifacts/lifetimeArtifact';
import { generateContentKey, encryptSlice } from './sharing';
import { wrapCapsuleKeyToWallet } from './walletEncryption';

/**
 * Wallet share row from database
 */
export type WalletShareRow = {
  id: string;
  created_at: string;
  created_by_wallet: string;
  recipient_wallet: string;
  kind: 'weekly' | 'summary' | 'yearly';
  ciphertext: string;
  iv: string;
  wrapped_key: string;
  expires_at: string | null;
  revoked_at: string | null;
  version: string;
  message: string | null;
};

/**
 * Create a wallet share
 * 
 * Process:
 * 1. Generate one-time content key for capsule
 * 2. Encrypt artifact JSON with content key
 * 3. Wrap content key to recipient wallet
 * 4. Insert into database
 * 
 * @param supabase - Supabase client
 * @param artifact - The ShareArtifact to share
 * @param recipientWallet - Recipient's wallet address
 * @param expiresAt - Optional expiration timestamp
 * @param message - Optional message from sender
 * @returns Share ID
 */
export async function createWalletShare(
  supabase: SupabaseClient,
  artifact: ShareArtifact,
  recipientWallet: string,
  expiresAt?: Date | null,
  message?: string | null
): Promise<string> {
  // Determine kind from artifact
  const kind: 'weekly' | 'summary' | 'yearly' = 
    artifact.kind === 'weekly' ? 'weekly' :
    artifact.kind === 'yearly' ? 'yearly' :
    'summary';

  // Generate one-time content key
  const contentKey = await generateContentKey();

  // Encrypt artifact JSON with content key using encryptSlice
  // encryptSlice returns "v1:base64(iv||ciphertext)" format
  const artifactJSON = JSON.stringify(artifact);
  const ciphertext = await encryptSlice(artifactJSON, contentKey);
  
  // Extract IV and ciphertext from encryptSlice format: "v1:base64(iv||ciphertext)"
  const ciphertextParts = ciphertext.split(':');
  if (ciphertextParts.length !== 2 || ciphertextParts[0] !== 'v1') {
    throw new Error('Invalid ciphertext format');
  }
  
  const decoded = Uint8Array.from(atob(ciphertextParts[1]), c => c.charCodeAt(0));
  const iv = decoded.slice(0, 12);
  const ct = decoded.slice(12);
  
  // Store IV and ciphertext separately in database
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...ct));
  
  // Wrap content key to recipient wallet
  const wrappedKey = await wrapCapsuleKeyToWallet(contentKey, recipientWallet);

  // Insert into database
  const { data, error } = await supabase.rpc('insert_wallet_share', {
    p_recipient_wallet: recipientWallet.toLowerCase(),
    p_kind: kind,
    p_ciphertext: ctB64, // Store ciphertext without IV
    p_iv: ivB64, // Store IV separately
    p_wrapped_key: wrappedKey,
    p_expires_at: expiresAt?.toISOString() || null,
    p_message: message || null,
  });

  if (error) {
    throw new Error(`Failed to create wallet share: ${error.message}`);
  }

  return data;
}

/**
 * List wallet shares sent by the current wallet
 */
export async function listWalletSharesSent(
  supabase: SupabaseClient,
  limit: number = 50,
  offset: number = 0
): Promise<WalletShareRow[]> {
  const { data, error } = await supabase.rpc('list_wallet_shares_sent', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(`Failed to list sent shares: ${error.message}`);
  }

  return data || [];
}

/**
 * List wallet shares received by the current wallet
 */
export async function listWalletSharesReceived(
  supabase: SupabaseClient,
  limit: number = 50,
  offset: number = 0
): Promise<WalletShareRow[]> {
  const { data, error } = await supabase.rpc('list_wallet_shares_received', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(`Failed to list received shares: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific wallet share by ID (only if recipient)
 */
export async function getWalletShare(
  supabase: SupabaseClient,
  shareId: string
): Promise<WalletShareRow> {
  const { data, error } = await supabase.rpc('get_wallet_share', {
    p_share_id: shareId,
  });

  if (error) {
    throw new Error(`Failed to get wallet share: ${error.message}`);
  }

  if (!data) {
    throw new Error('Share not found');
  }

  return data;
}

/**
 * Revoke a wallet share
 */
export async function revokeWalletShare(
  supabase: SupabaseClient,
  shareId: string
): Promise<void> {
  const { error } = await supabase.rpc('revoke_wallet_share', {
    p_share_id: shareId,
  });

  if (error) {
    throw new Error(`Failed to revoke wallet share: ${error.message}`);
  }
}

/**
 * Decrypt a wallet share
 * 
 * Process:
 * 1. Unwrap capsule key using recipient's wallet
 * 2. Decrypt artifact JSON with capsule key
 * 
 * @param share - Wallet share row
 * @param recipientWallet - Recipient's wallet address (for decryption)
 * @returns Decrypted ShareArtifact
 */
export async function decryptWalletShare(
  share: WalletShareRow,
  recipientWallet: string
): Promise<ShareArtifact> {
  // Import unwrap function
  const { unwrapCapsuleKeyFromWallet } = await import('./walletEncryption');
  const { decryptSlice } = await import('./sharing');

  // Unwrap capsule key
  const contentKey = await unwrapCapsuleKeyFromWallet(share.wrapped_key, recipientWallet);

  // Reconstruct ciphertext format: "v1:base64(iv||ciphertext)" for decryptSlice
  const iv = Uint8Array.from(atob(share.iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(share.ciphertext), c => c.charCodeAt(0));
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  // Convert to base64 and prepend "v1:" prefix
  const combinedB64 = btoa(String.fromCharCode(...combined));
  const ciphertext = `v1:${combinedB64}`;

  // Decrypt artifact
  const artifactJSON = await decryptSlice(ciphertext, contentKey);
  
  if (typeof artifactJSON !== 'string') {
    throw new Error('Invalid decrypted artifact format');
  }

  return JSON.parse(artifactJSON) as ShareArtifact;
}

