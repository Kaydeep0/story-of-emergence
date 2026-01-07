// src/lib/crypto.ts
console.log('[crypto] loaded');

// --- types ---

/** EIP-1193 provider interface for ethereum wallet */
interface EthereumProvider {
  request: (args: { method: string; params: unknown[] }) => Promise<string>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// --- helpers ---

/**
 * Convert Uint8Array to ArrayBuffer for WebCrypto APIs
 * Returns a real ArrayBuffer containing exactly the bytes in the view
 */
export function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Create a new ArrayBuffer and copy the data to ensure we have a pure ArrayBuffer
  const buf = new ArrayBuffer(u8.length);
  new Uint8Array(buf).set(u8);
  return buf;
}

// Convert "0x..." hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// --- key derivation (consent signature → AES key) ---
export async function deriveKeyFromSignature(address: string): Promise<CryptoKey> {
  if (!window?.ethereum) throw new Error('No wallet detected');

  const msg = `Story of Emergence — encryption key consent for ${address}`;
  const hexSig: string = await window.ethereum.request({
    method: 'personal_sign',
    params: [msg, address],
  });

  const sigBytes = hexToBytes(hexSig);
  const digest = await crypto.subtle.digest('SHA-256', u8ToArrayBuffer(sigBytes)); // 32 bytes
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// --- app key derivation (fixed secret → AES key for wallet shares) ---
/**
 * Derive a fixed app key from a constant secret for wallet shares
 * This allows any user to decrypt wallet shares (access control via wallet address, not encryption)
 */
async function deriveAppKey(): Promise<CryptoKey> {
  const appSecret = 'Story of Emergence — wallet shares app key v1';
  const secretBytes = new TextEncoder().encode(appSecret);
  const digest = await crypto.subtle.digest('SHA-256', u8ToArrayBuffer(secretBytes));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt data with the app key (for wallet shares)
 * Returns an EncryptionEnvelope with ciphertext, iv, and version
 */
export async function encryptWithAppKey(plaintext: string): Promise<EncryptionEnvelope> {
  const appKey = await deriveAppKey();
  return encryptText(appKey, plaintext);
}

/**
 * Decrypt data with the app key (for wallet shares)
 */
export async function decryptWithAppKey(envelope: EncryptionEnvelope): Promise<string> {
  const appKey = await deriveAppKey();
  return decryptText(appKey, envelope);
}

// --- legacy encrypt/decrypt (used in early versions) ---

// Encrypt a JSON object -> base64(iv || ciphertext)
export async function encryptJSON(obj: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, u8ToArrayBuffer(plaintext));

  const payload = new Uint8Array(iv.length + (ct as ArrayBuffer).byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ct), iv.length);

  // base64 encode
  let s = '';
  for (let i = 0; i < payload.length; i++) s += String.fromCharCode(payload[i]);
  return btoa(s);
}

// Decrypt base64(iv || ciphertext) -> JSON object
export async function decryptJSON(b64: string, key: CryptoKey): Promise<unknown> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, u8ToArrayBuffer(ct));
  return JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
}

// --- derive an AES key directly from a hex signature ---
export async function keyFromSignatureHex(hexSig: string): Promise<CryptoKey> {
  const sigBytes = hexToBytes(hexSig);
  const digest = await crypto.subtle.digest('SHA-256', u8ToArrayBuffer(sigBytes));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// --- legacy fallback for plain base64 JSON ---
export function tryDecodeLegacyJSON(b64: string): unknown {
  try {
    const txt = atob(b64);
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

// --- v1 AES-GCM wrappers (real encryption layer) ---
// Format: "v1:" + base64( iv(12 bytes) || ciphertext+tag )
export async function aesGcmEncryptText(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, u8ToArrayBuffer(data));

  const payload = new Uint8Array(iv.length + (ct as ArrayBuffer).byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ct), iv.length);

  let s = '';
  for (let i = 0; i < payload.length; i++) s += String.fromCharCode(payload[i]);
  return `v1:${btoa(s)}`;
}

export async function aesGcmDecryptText(key: CryptoKey, packed: string): Promise<string> {
  if (!packed.startsWith('v1:')) throw new Error('Unsupported ciphertext format');
  const b64 = packed.slice(3);
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, u8ToArrayBuffer(ct));
  return new TextDecoder().decode(new Uint8Array(pt));
}

// --- Encryption envelope format (for shares) ---

/**
 * Encryption envelope structure
 */
export type EncryptionEnvelope = {
  ciphertext: string; // base64-encoded ciphertext+tag
  iv: string; // base64-encoded IV (12 bytes)
  tag?: string; // base64-encoded tag (16 bytes) - included in ciphertext for AES-GCM
  version: string; // encryption version, e.g., "v1"
};

/**
 * Encrypt plaintext and return envelope with separate fields
 * @param key - AES-GCM key
 * @param plaintext - text to encrypt
 * @returns Encryption envelope with ciphertext, iv, and version
 */
export async function encryptText(key: CryptoKey, plaintext: string): Promise<EncryptionEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, u8ToArrayBuffer(data));
  
  // For AES-GCM, the tag is appended to the ciphertext
  // The ciphertext includes: actual ciphertext + 16-byte authentication tag
  const ciphertextWithTag = new Uint8Array(ct);
  
  // Encode IV and ciphertext+tag as base64
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ciphertextB64 = btoa(String.fromCharCode(...ciphertextWithTag));
  
  return {
    ciphertext: ciphertextB64,
    iv: ivB64,
    version: 'v1',
  };
}

/**
 * Decrypt using envelope format
 * @param key - AES-GCM key
 * @param envelope - encryption envelope with ciphertext, iv, and optional tag
 * @returns decrypted plaintext
 */
export async function decryptText(key: CryptoKey, envelope: EncryptionEnvelope): Promise<string> {
  if (envelope.version !== 'v1') {
    throw new Error(`Unsupported encryption version: ${envelope.version}`);
  }
  
  // Decode IV and ciphertext from base64
  const iv = Uint8Array.from(atob(envelope.iv), (c) => c.charCodeAt(0));
  const ciphertextWithTag = Uint8Array.from(atob(envelope.ciphertext), (c) => c.charCodeAt(0));
  
  // Decrypt (AES-GCM automatically handles the tag)
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    u8ToArrayBuffer(ciphertextWithTag)
  );
  
  return new TextDecoder().decode(new Uint8Array(pt));
}
