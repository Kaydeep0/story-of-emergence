// src/app/lib/wallet_shares.ts
// CANONICAL wallet-to-wallet sharing library
// 
// This is the single source of truth for wallet sharing.
// All wallet-to-wallet sharing MUST use this library.
//
// DEPRECATED: Do not use shares, accepted_shares, or capsules tables.
// Use wallet_shares table only via the RPCs in this file.

import { getSupabaseForWallet } from './supabase';
import { 
  createWalletShare as createWalletShareCore,
  listWalletSharesSent as listWalletSharesSentCore,
  listWalletSharesReceived as listWalletSharesReceivedCore,
  getWalletShare as getWalletShareCore,
  revokeWalletShare as revokeWalletShareCore,
  decryptWalletShare as decryptWalletShareCore,
  type WalletShareRow as WalletShareRowCore
} from '../../lib/walletShares';

// Re-export types for convenience
export type WalletShareRow = WalletShareRowCore;

/**
 * Create a new wallet share
 * @param wallet - Sender's wallet address
 * @param recipientWallet - Recipient's wallet address
 * @param artifact - ShareArtifact to share
 * @param expiresAt - Optional expiration date
 * @param message - Optional message from sender
 * @returns Share ID (UUID)
 */
export async function createWalletShare(
  wallet: string,
  recipientWallet: string,
  artifact: import('../../lib/artifacts/types').ShareArtifact,
  expiresAt?: Date | null,
  message?: string | null
): Promise<string> {
  const supabase = getSupabaseForWallet(wallet);
  return createWalletShareCore(supabase, artifact, recipientWallet, expiresAt, message);
}

/**
 * List shares sent by the current wallet
 * @param wallet - Wallet address
 * @param opts - Pagination options
 * @returns Array of wallet share rows
 */
export async function listWalletSharesSent(
  wallet: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<WalletShareRow[]> {
  const { limit = 50, offset = 0 } = opts;
  const supabase = getSupabaseForWallet(wallet);
  return listWalletSharesSentCore(supabase, limit, offset);
}

/**
 * List shares received by the current wallet (not revoked, not expired)
 * @param wallet - Wallet address
 * @param opts - Pagination options
 * @returns Array of wallet share rows
 */
export async function listWalletSharesReceived(
  wallet: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<WalletShareRow[]> {
  const { limit = 50, offset = 0 } = opts;
  const supabase = getSupabaseForWallet(wallet);
  return listWalletSharesReceivedCore(supabase, limit, offset);
}

/**
 * Get a specific wallet share by ID (only if recipient)
 * @param wallet - Recipient's wallet address
 * @param shareId - Share ID (UUID)
 * @returns Wallet share row
 */
export async function getWalletShare(
  wallet: string,
  shareId: string
): Promise<WalletShareRow> {
  const supabase = getSupabaseForWallet(wallet);
  return getWalletShareCore(supabase, shareId);
}

/**
 * Revoke a wallet share (set revoked_at timestamp)
 * @param wallet - Sender's wallet address
 * @param shareId - Share ID (UUID)
 */
export async function revokeWalletShare(
  wallet: string,
  shareId: string
): Promise<void> {
  const supabase = getSupabaseForWallet(wallet);
  return revokeWalletShareCore(supabase, shareId);
}

/**
 * Decrypt a wallet share
 * @param share - Wallet share row
 * @param recipientWallet - Recipient's wallet address (for decryption)
 * @returns Decrypted ShareArtifact
 */
export async function decryptWalletShare(
  share: WalletShareRow,
  recipientWallet: string
): Promise<import('../../lib/artifacts/types').ShareArtifact> {
  return decryptWalletShareCore(share, recipientWallet);
}

