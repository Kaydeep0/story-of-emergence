// src/lib/sharing.ts
// Types and helpers for private sharing (Phase 2)

// ----- Types -----

/**
 * Slice types that can be shared
 */
export type SliceKind = 'topic_slice' | 'link_collection' | 'reflection_excerpt' | 'reflection';

/**
 * A capsule is a URL-safe encoded object that allows a recipient
 * to decrypt a shared slice using their wallet-derived key.
 */
export type CapsulePayload = {
  /** UUID of the share in Supabase */
  shareId: string;
  /** Hex-encoded wrapped content key (encrypted for recipient) */
  wrappedKey: string;
  /** Optional expiry timestamp (ISO string) */
  expiresAt?: string;
  /** Optional signature from sender for authenticity verification */
  signature?: string;
  /** Sender's wallet address (lowercase) */
  senderWallet: string;
};

/**
 * Row from shares table in Supabase
 */
export type ShareRow = {
  id: string;
  sender_wallet: string;
  recipient_wallet: string;
  slice_kind: SliceKind;
  ciphertext: string; // AES-GCM encrypted slice payload
  title: string;
  expires_at: string | null;
  created_at: string;
};

/**
 * Decrypted slice content (after unwrapping key and decrypting)
 */
export type DecryptedSlice = {
  kind: SliceKind;
  title: string;
  content: unknown; // could be topic data, links array, reflection text, etc.
  createdAt: string;
  senderWallet: string;
};

/**
 * An accepted share stored locally (will be re-encrypted under user's key)
 */
export type AcceptedShare = {
  id: string;
  receivedAt: string; // ISO timestamp
  sourceLabel: string; // e.g., "From 0x1234...5678 on Dec 4, 2025"
  sliceKind: SliceKind;
  title: string;
  decryptedPayload: unknown;
};

/**
 * Accepted share row from Supabase (encrypted under recipient's key)
 */
export type AcceptedShareRow = {
  id: string;
  wallet_address: string;
  share_id: string;
  slice_kind: string;
  title: string;
  ciphertext: string;
  received_at: string;
  source_label: string;
  created_at: string;
};

// ----- Capsule encoding/decoding -----

/**
 * Encode a capsule payload to a URL-safe base64 string
 */
export function encodeCapsule(capsule: CapsulePayload): string {
  const json = JSON.stringify(capsule);
  // Use base64url encoding (URL-safe)
  const b64 = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return b64;
}

/**
 * Decode a capsule from URL-safe base64 string
 * Returns null if decoding fails
 */
export function decodeCapsule(encoded: string): CapsulePayload | null {
  try {
    // Restore base64 from base64url
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (b64.length % 4) b64 += '=';
    const json = atob(b64);
    const parsed = JSON.parse(json);
    
    // Basic validation
    if (
      typeof parsed.shareId !== 'string' ||
      typeof parsed.wrappedKey !== 'string' ||
      typeof parsed.senderWallet !== 'string'
    ) {
      return null;
    }
    
    return parsed as CapsulePayload;
  } catch {
    return null;
  }
}

/**
 * Check if a capsule has expired
 */
export function isCapsuleExpired(capsule: CapsulePayload): boolean {
  if (!capsule.expiresAt) return false;
  const expiryDate = new Date(capsule.expiresAt);
  return expiryDate.getTime() < Date.now();
}

/**
 * Build a full capsule URL for sharing
 */
export function buildCapsuleUrl(capsule: CapsulePayload, baseUrl: string): string {
  const encoded = encodeCapsule(capsule);
  return `${baseUrl}/shared/open?capsule=${encoded}`;
}

// ----- Key wrapping helpers -----

/**
 * Generate a random AES-GCM content key for encrypting a slice
 */
export async function generateContentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can wrap it
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to raw bytes
 */
export async function exportKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

/**
 * Import raw bytes as an AES-GCM key
 */
export async function importKeyRaw(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * Wrap a content key using the recipient's wallet-derived key.
 * Uses AES-GCM for wrapping (encrypts the raw key bytes).
 * Returns hex-encoded wrapped key (iv || ciphertext).
 */
export async function wrapKeyForRecipient(
  contentKey: CryptoKey,
  recipientDerivedKey: CryptoKey
): Promise<string> {
  const raw = await exportKeyRaw(contentKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    recipientDerivedKey,
    raw
  );
  
  // Combine iv + ciphertext
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  
  // Convert to hex
  return Array.from(combined)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Unwrap a content key using the local wallet-derived key.
 * @param wrappedKeyHex - hex-encoded wrapped key (iv || ciphertext)
 * @param localDerivedKey - the recipient's wallet-derived AES key
 * @returns the unwrapped content key
 */
export async function unwrapKeyForRecipient(
  wrappedKeyHex: string,
  localDerivedKey: CryptoKey
): Promise<CryptoKey> {
  // Decode hex to bytes
  const combined = new Uint8Array(wrappedKeyHex.length / 2);
  for (let i = 0; i < combined.length; i++) {
    combined[i] = parseInt(wrappedKeyHex.slice(i * 2, i * 2 + 2), 16);
  }
  
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  
  const rawKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    localDerivedKey,
    ct
  );
  
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
}

// ----- Slice encryption/decryption -----

/**
 * Encrypt a slice payload with a content key
 * Returns v1-format ciphertext
 */
export async function encryptSlice(
  payload: unknown,
  contentKey: CryptoKey
): Promise<string> {
  const plaintext = JSON.stringify(payload);
  const data = new TextEncoder().encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, data);
  
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  
  // Base64 encode with v1 prefix for consistency
  let s = '';
  for (let i = 0; i < combined.length; i++) {
    s += String.fromCharCode(combined[i]);
  }
  return `v1:${btoa(s)}`;
}

/**
 * Decrypt a slice payload with a content key
 */
export async function decryptSlice(
  ciphertext: string,
  contentKey: CryptoKey
): Promise<unknown> {
  if (!ciphertext.startsWith('v1:')) {
    throw new Error('Unsupported ciphertext format');
  }
  
  const b64 = ciphertext.slice(3);
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, contentKey, ct);
  const text = new TextDecoder().decode(new Uint8Array(pt));
  return JSON.parse(text);
}

/**
 * Format a short wallet address for display
 */
export function formatWalletShort(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Create a source label from sender wallet and date
 */
export function createSourceLabel(senderWallet: string, receivedAt: Date): string {
  const shortWallet = formatWalletShort(senderWallet);
  const dateStr = receivedAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `From ${shortWallet} on ${dateStr}`;
}

