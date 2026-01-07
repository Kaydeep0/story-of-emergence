// src/lib/walletShares.ts
// API functions for creating and reading wallet-based shares

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShareArtifact } from './artifacts/types';
import { encryptWithAppKey, decryptWithAppKey } from './crypto';
import type { EncryptionEnvelope } from './crypto';

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
  expires_at: string | null;
  revoked_at: string | null;
  version: string;
  message: string | null;
};

/**
 * Create a wallet share
 * 
 * Process:
 * 1. Encrypt SharePack JSON (preferred) or artifact JSON (legacy) with app key
 * 2. Insert into database
 * 
 * @param supabase - Supabase client
 * @param artifact - The ShareArtifact to share (legacy, use sharePack instead)
 * @param recipientWallet - Recipient's wallet address
 * @param expiresAt - Optional expiration timestamp
 * @param message - Optional message from sender
 * @param sharePack - The SharePack to share (preferred over artifact)
 * @returns Share ID
 */
export async function createWalletShare(
  supabase: SupabaseClient,
  artifact: ShareArtifact,
  recipientWallet: string,
  expiresAt?: Date | null,
  message?: string | null,
  sharePack?: import('../app/lib/share/sharePack').SharePack
): Promise<string> {
  // Determine kind from sharePack (preferred) or artifact (legacy)
  let kind: 'weekly' | 'summary' | 'yearly';
  let payloadJSON: string;
  
  if (sharePack) {
    // Use SharePack - universal payload
    kind = sharePack.lens === 'weekly' ? 'weekly' :
           sharePack.lens === 'yearly' ? 'yearly' :
           'summary';
    payloadJSON = JSON.stringify(sharePack);
  } else {
    // Legacy artifact
    kind = artifact.kind === 'weekly' ? 'weekly' :
           artifact.kind === 'yearly' ? 'yearly' :
           'summary';
    payloadJSON = JSON.stringify(artifact);
  }

  // Encrypt payload JSON with app key
  const envelope = await encryptWithAppKey(payloadJSON);

  // Insert into database
  const { data, error } = await supabase.rpc('insert_wallet_share', {
    p_recipient_wallet: recipientWallet.toLowerCase(),
    p_kind: kind,
    p_ciphertext: envelope.ciphertext,
    p_iv: envelope.iv,
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
 * 1. Decrypt artifact JSON with app key
 * 
 * @param share - Wallet share row
 * @param recipientWallet - Recipient's wallet address (unused, kept for API compatibility)
 * @returns Decrypted ShareArtifact or SharePack
 */
export async function decryptWalletShare(
  share: WalletShareRow,
  recipientWallet: string
): Promise<ShareArtifact> {
  // Create encryption envelope from database fields
  const envelope: EncryptionEnvelope = {
    ciphertext: share.ciphertext,
    iv: share.iv,
    version: share.version || 'v1',
  };

  // Decrypt with app key
  const payloadJSON = await decryptWithAppKey(envelope);
  
  // Parse and return (could be SharePack or legacy ShareArtifact)
  return JSON.parse(payloadJSON) as ShareArtifact;
}

