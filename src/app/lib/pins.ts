// src/app/lib/pins.ts
// Client-side functions for derived_artifacts table (Pins feature)

'use client';

import { getSupabaseForWallet } from './supabase';
import { aesGcmEncryptText, aesGcmDecryptText } from '../../lib/crypto';

// ----- Types -----

export type PinKind = 'cluster_pin' | 'thread_pin' | 'bridge_pin' | 'narrative_bridge_pin';

export interface ClusterPinPayload {
  id: string;
  createdAt: string;
  label: string;
  asOf: string | null;
  clusterId: number;
  memberIds: string[];
  size: number;
  timeRange: {
    earliest: string;
    latest: string;
  };
  topNodes: Array<{
    id: string;
    degree: number;
  }>;
}

export interface ThreadPinPayload {
  id: string;
  createdAt: string;
  label: string;
  asOf: string | null;
  seedReflectionId: string;
  orderedReflectionIds: string[];
  keyBridges: Array<{
    from: string;
    to: string;
    weight: number;
    reasons: string[];
  }>;
}

export interface BridgePinPayload {
  id: string;
  createdAt: string;
  label: string;
  fromReflectionId: string;
  toReflectionId: string;
  bridge: {
    title: string;
    claim: string;
    translation?: string;
    consequences: string[];
    frame: string;
    echoes: string[];
    signals: Array<{
      kind: string;
      score: number;
      hits: string[];
    }>;
    createdAtIso: string;
    version: number;
  };
}

export interface NarrativeBridgePinPayload {
  id: string;
  createdAt: string;
  label: string;
  fromReflectionId: string;
  toReflectionId: string;
  explanation: string; // Bridge sentence
  reasons: string[]; // Bridge reason tags
  weight: number; // Bridge weight
  tags?: string[]; // Optional tags
}

export type PinPayload = ClusterPinPayload | ThreadPinPayload | BridgePinPayload | NarrativeBridgePinPayload;

export interface DerivedArtifactRow {
  id: string;
  wallet_address: string;
  kind: string;
  scope: string;
  ciphertext: string;
  encryption_version: number;
  created_at: string;
  updated_at: string;
}

export interface DerivedArtifact {
  id: string;
  kind: PinKind;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
  payload: PinPayload;
}

// ----- Encryption helpers -----

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

async function encryptJSON(sessionKey: CryptoKey, obj: unknown): Promise<string> {
  const text = safeStringify(obj);
  // Returns "v1:<base64(iv||ciphertext+tag)>"
  return aesGcmEncryptText(sessionKey, text);
}

async function decryptJSON(sessionKey: CryptoKey, cipher: string): Promise<unknown> {
  if (cipher.startsWith('v1:')) {
    const plain = await aesGcmDecryptText(sessionKey, cipher);
    return JSON.parse(plain);
  }
  throw new Error('Unable to decrypt artifact');
}

// ----- RPC calls -----

/**
 * Insert a new pin (encrypted client-side)
 */
export async function rpcInsertPin(
  wallet: string,
  sessionKey: CryptoKey,
  kind: PinKind,
  scope: string,
  payload: PinPayload
): Promise<string> {
  const supabase = getSupabaseForWallet(wallet);
  const cipher = await encryptJSON(sessionKey, payload);

  const { data, error } = await supabase.rpc('insert_derived_artifact', {
    w: wallet.toLowerCase(),
    p_kind: kind,
    p_scope: scope,
    p_ciphertext: cipher,
    p_encryption_version: 1,
  });

  if (error) throw error;
  return String(data);
}

/**
 * List pins with optional kind filter
 */
export async function rpcListPins(
  wallet: string,
  sessionKey: CryptoKey,
  kind: PinKind | null = null,
  limit = 100,
  offset = 0
): Promise<DerivedArtifact[]> {
  const supabase = getSupabaseForWallet(wallet);

  const { data, error } = await supabase.rpc('list_derived_artifacts', {
    w: wallet.toLowerCase(),
    p_kind: kind,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data || []) as DerivedArtifactRow[];
  const artifacts: DerivedArtifact[] = [];

  for (const row of rows) {
    try {
      const payload = await decryptJSON(sessionKey, row.ciphertext) as PinPayload;
      artifacts.push({
        id: row.id,
        kind: row.kind as PinKind,
        scope: row.scope,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        payload,
      });
    } catch (err) {
      console.error(`Failed to decrypt artifact ${row.id}:`, err);
      // Skip corrupted artifacts
    }
  }

  return artifacts;
}

/**
 * Update pin ciphertext (for renaming)
 */
export async function rpcUpdatePin(
  wallet: string,
  sessionKey: CryptoKey,
  artifactId: string,
  payload: PinPayload
): Promise<void> {
  const supabase = getSupabaseForWallet(wallet);
  const cipher = await encryptJSON(sessionKey, payload);

  const { error } = await supabase.rpc('update_derived_artifact', {
    w: wallet.toLowerCase(),
    p_id: artifactId,
    p_ciphertext: cipher,
  });

  if (error) throw error;
}

/**
 * Delete a pin
 */
export async function rpcDeletePin(
  wallet: string,
  artifactId: string
): Promise<void> {
  const supabase = getSupabaseForWallet(wallet);

  const { error } = await supabase.rpc('delete_derived_artifact', {
    w: wallet.toLowerCase(),
    p_id: artifactId,
  });

  if (error) throw error;
}

