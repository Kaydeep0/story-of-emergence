// src/lib/crypto.ts
console.log('[crypto] loaded');

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

// Ask the wallet to sign a fixed message and derive an AES key from the signature.
// This costs $0 and just shows a sign prompt in your wallet.
export async function deriveKeyFromSignature(address: string): Promise<CryptoKey> {
  if (!(window as any)?.ethereum) throw new Error('No wallet detected');

  const msg = `Story of Emergence — encryption key consent for ${address}`;
  const hexSig: string = await (window as any).ethereum.request({
    method: 'personal_sign',
    params: [msg, address],
  });

  const sigBytes = hexToBytes(hexSig);
  const digest = await crypto.subtle.digest('SHA-256', sigBytes); // 32 bytes
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// Encrypt a JSON object -> base64(iv || ciphertext)
export async function encryptJSON(obj: any, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const payload = new Uint8Array(iv.length + (ct as ArrayBuffer).byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ct), iv.length);

  // base64 encode
  let s = '';
  for (let i = 0; i < payload.length; i++) s += String.fromCharCode(payload[i]);
  return btoa(s);
}

// (Optional) Decrypt base64(iv || ciphertext) -> JSON object
export async function decryptJSON(b64: string, key: CryptoKey): Promise<any> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
}
// --- derive an AES key from a hex signature (using existing hexToBytes) ---
export async function keyFromSignatureHex(hexSig: string): Promise<CryptoKey> {
  const sigBytes = hexToBytes(hexSig); // hexToBytes already exists above
  const digest = await crypto.subtle.digest('SHA-256', sigBytes);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
// Best-effort decode for the very first placeholder saves (no AES, just base64 JSON)
export function tryDecodeLegacyJSON(b64: string): any | null {
  try {
    // quick sniff: many base64 JSON strings start with "ey" (for '{"' )
    const txt = atob(b64);
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
