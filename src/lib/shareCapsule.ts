/**
 * Share Capsule System
 * 
 * LEGACY: Do not extend. Canonical sharing uses wallet_shares.
 * 
 * Encrypted sharing of artifacts to a single recipient.
 * 
 * Rules:
 * - Server cannot read contents
 * - Link is meaningless without the key
 * - Artifact remains immutable
 * - Sender retains authorship
 * - No persistence (in-memory only)
 * - No Supabase writes
 */

import type { ShareArtifact } from './artifacts/types';
import { aesGcmEncryptText, aesGcmDecryptText } from './crypto';
import { u8ToArrayBuffer } from './crypto';

export type ShareArtifactKind = ShareArtifact['kind'];

export type ShareCapsule = {
  artifactId: string;
  kind: ShareArtifactKind;
  encryptedPayload: string; // AES-GCM encrypted artifact JSON
  recipient: string; // wallet or public key (string for now)
  createdAt: string; // ISO timestamp
};

/**
 * Derive a capsule key from sender wallet + recipient + artifactId
 * 
 * Uses SHA-256 to create a deterministic key that requires all three inputs.
 */
async function deriveCapsuleKey(
  senderWallet: string,
  recipient: string,
  artifactId: string
): Promise<CryptoKey> {
  // Normalize inputs
  const normalizedSender = senderWallet.toLowerCase();
  const normalizedRecipient = recipient.toLowerCase();
  
  // Concatenate inputs
  const input = `${normalizedSender}|${normalizedRecipient}|${artifactId}`;
  
  // Derive key using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', u8ToArrayBuffer(data));
  
  // Import as AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Create an encrypted share capsule
 * 
 * @param artifact - The artifact to encrypt
 * @param senderWallet - Sender's wallet address
 * @param recipient - Recipient identifier (wallet or public key)
 * @returns Encrypted share capsule (in-memory only)
 */
export async function createShareCapsule(
  artifact: ShareArtifact,
  senderWallet: string,
  recipient: string
): Promise<ShareCapsule> {
  // Guardrail: ensure artifact has identity
  if (!artifact.artifactId) {
    throw new Error('Artifact missing identity: artifactId is required');
  }
  
  // Derive capsule key
  const capsuleKey = await deriveCapsuleKey(senderWallet, recipient, artifact.artifactId);
  
  // Serialize artifact
  const artifactJson = JSON.stringify(artifact);
  
  // Encrypt artifact
  const encryptedPayload = await aesGcmEncryptText(capsuleKey, artifactJson);
  
  // Create capsule
  const capsule: ShareCapsule = {
    artifactId: artifact.artifactId,
    kind: artifact.kind,
    encryptedPayload,
    recipient: recipient.toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  
  // Log capsule creation (local only, no persistence)
  console.log('[ShareCapsule] Created:', {
    artifactId: capsule.artifactId,
    kind: capsule.kind,
    recipient: capsule.recipient,
    createdAt: capsule.createdAt,
  });
  
  return capsule;
}

/**
 * Decrypt a share capsule
 * 
 * @param capsule - The encrypted capsule
 * @param senderWallet - Original sender's wallet address
 * @param recipientWallet - Recipient's wallet address (must match capsule.recipient)
 * @returns Decrypted artifact
 */
export async function decryptShareCapsule(
  capsule: ShareCapsule,
  senderWallet: string,
  recipientWallet: string
): Promise<ShareArtifact> {
  // Verify recipient matches
  if (capsule.recipient.toLowerCase() !== recipientWallet.toLowerCase()) {
    throw new Error('Recipient mismatch: capsule not intended for this wallet');
  }
  
  // Derive capsule key (same inputs as encryption)
  const capsuleKey = await deriveCapsuleKey(senderWallet, recipientWallet, capsule.artifactId);
  
  // Decrypt payload
  const artifactJson = await aesGcmDecryptText(capsuleKey, capsule.encryptedPayload);
  
  // Parse and return artifact
  return JSON.parse(artifactJson) as ShareArtifact;
}

