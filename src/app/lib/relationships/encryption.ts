// src/app/lib/relationships/encryption.ts
// Encryption and decryption helpers for relationship payloads using AES-GCM

import { aesGcmEncryptText, aesGcmDecryptText } from '../../../lib/crypto';
import type { RelationshipGraph, EncryptedRelationshipPayload } from './types';

/**
 * Safe stringify that ignores circular refs and functions
 */
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === 'function') return undefined;
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      return value;
    }
  );
}

/**
 * Encrypt a relationship graph to ciphertext
 * Uses the same AES-GCM pattern as entries
 * @param sessionKey - AES-GCM encryption key
 * @param graph - Relationship graph to encrypt
 * @returns Encrypted payload with ciphertext
 */
export async function encryptRelationshipGraph(
  sessionKey: CryptoKey,
  graph: RelationshipGraph
): Promise<EncryptedRelationshipPayload> {
  const text = safeStringify(graph);
  // Returns "v1:<base64(iv||ciphertext+tag)>"
  const ciphertext = await aesGcmEncryptText(sessionKey, text);
  return { ciphertext };
}

/**
 * Decrypt a relationship graph from ciphertext
 * Uses the same AES-GCM pattern as entries
 * @param sessionKey - AES-GCM decryption key
 * @param payload - Encrypted payload with ciphertext
 * @returns Decrypted relationship graph
 */
export async function decryptRelationshipGraph(
  sessionKey: CryptoKey,
  payload: EncryptedRelationshipPayload
): Promise<RelationshipGraph> {
  const { ciphertext } = payload;
  
  // New format first (v1: AES-GCM)
  if (ciphertext.startsWith('v1:')) {
    const plain = await aesGcmDecryptText(sessionKey, ciphertext);
    return JSON.parse(plain) as RelationshipGraph;
  }
  
  // Legacy fallback: plain base64(JSON) - for compatibility
  try {
    const text = atob(ciphertext);
    return JSON.parse(text) as RelationshipGraph;
  } catch {
    throw new Error('Unable to decrypt relationship graph');
  }
}

