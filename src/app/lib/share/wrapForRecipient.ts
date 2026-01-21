/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical wallet_shares sharing system
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

import type { SharePack } from './sharePack';
import type { Capsule } from './capsule';
import { generateContentKey, wrapKeyForRecipient, encryptSlice } from '../../../lib/sharing';

/**
 * Wrap Share Pack for a specific recipient
 * Client-side only, no server crypto
 * Generates ephemeral content key, encrypts Share Pack, wraps key for recipient
 * 
 * IMPORTANT: The recipient's derived key must be obtained beforehand.
 * This requires the recipient to sign the standard message:
 * "Story of Emergence — encryption key consent for {address}"
 * 
 * The sender must obtain this signature (or derived key) through an explicit
 * cryptographic intent flow before calling this function.
 * 
 * @param sharePack Share Pack to encrypt
 * @param recipientDerivedKey Recipient's wallet-derived AES key (from signature)
 * @param recipientWalletAddress Recipient's wallet address (for capsule metadata)
 * @param expiresAt Optional expiry timestamp
 * @returns Capsule object with encrypted payload and wrapped key
 */
export async function wrapSharePackForRecipient(
  sharePack: SharePack,
  recipientDerivedKey: CryptoKey,
  recipientWalletAddress: string,
  expiresAt?: number
): Promise<Capsule> {
  // Generate ephemeral content key (one-time-use)
  const contentKey = await generateContentKey();

  // Encrypt Share Pack with content key
  const encryptedPayload = await encryptSlice(sharePack, contentKey);

  // Wrap content key for recipient using their derived key
  const wrappedKey = await wrapKeyForRecipient(contentKey, recipientDerivedKey);

  // Generate capsule ID (deterministic from checksum + recipient + timestamp)
  const checksum = sharePack.checksum || '';
  const capsuleId = `capsule-${checksum.slice(0, 8)}-${recipientWalletAddress.slice(2, 10)}-${Date.now().toString(36)}`;

  const capsule: Capsule = {
    capsuleId,
    createdAt: Date.now(),
    expiresAt,
    sharePackChecksum: checksum,
    wrappedKey,
    recipientPublicKey: recipientWalletAddress.toLowerCase(),
    payload: encryptedPayload,
  };

  return capsule;
}

