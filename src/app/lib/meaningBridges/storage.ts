import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeaningBridge } from "./types";
import type { NarrativeBridge } from "./buildNarrativeBridge";
import { encryptText, decryptText } from "../../../lib/crypto";

// Helper to safely stringify JSON (handles circular refs)
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === "function") return undefined;
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      return value;
    }
  );
}

// Encrypt JSON object and return envelope with separate fields
async function encryptJson<T>(obj: T, key: CryptoKey): Promise<{ ciphertext: string; iv: string; alg: string; version: number }> {
  const plaintext = safeStringify(obj);
  const envelope = await encryptText(key, plaintext);
  return {
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    alg: "AES-GCM",
    version: parseInt(envelope.version.replace("v", "")) || 1,
  };
}

// Decrypt JSON object from envelope fields
async function decryptJson<T>(envelope: { ciphertext: string; iv: string; alg: string; version: number }, key: CryptoKey): Promise<T> {
  const decryptedText = await decryptText(key, {
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    version: `v${envelope.version}`,
  });
  return JSON.parse(decryptedText) as T;
}

// Reason edges live here. Similarity edges are candidates only.
export async function upsertBridgeEncrypted(opts: {
  supabase: SupabaseClient;
  wallet: string;
  fromId: string;
  toId: string;
  bridge: MeaningBridge;
  key: CryptoKey;
}) {
  const { ciphertext, iv, alg, version } = await encryptJson(opts.bridge, opts.key);

  const { data, error } = await opts.supabase
    .from("reflection_link_bridges")
    .upsert({
      wallet_address: opts.wallet,
      from_reflection_id: opts.fromId,
      to_reflection_id: opts.toId,
      ciphertext,
      iv,
      alg,
      version
    }, { onConflict: "wallet_address,from_reflection_id,to_reflection_id" })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

// Reason edges live here. Similarity edges are candidates only.
export async function fetchBridgesForWallet(opts: {
  supabase: SupabaseClient;
  wallet: string;
  key: CryptoKey;
  limit?: number;
  offset?: number;
}) {
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  
  const { data, error } = await opts.supabase.rpc("list_reflection_bridges", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("[bridges] list_reflection_bridges failed", error);
    throw error;
  }

  const rows = data ?? [];

  const decoded = [];
  let unknownTypeCount = 0;
  const unknownTypeSamples: unknown[] = [];
  
  for (const r of rows) {
    try {
      const payload = await decryptJson<MeaningBridge | { kind?: string; version?: number | string; explanation?: string; reasons?: string[]; weight?: number; signals?: Record<string, any> }>({ ciphertext: r.ciphertext, iv: r.iv, alg: r.alg, version: r.version }, opts.key);
      
      // Check if it's a narrative bridge (has version: "narrative_v1")
      if (payload && typeof payload === 'object' && 'version' in payload && payload.version === 'narrative_v1') {
        // It's a narrative bridge
        const narrativePayload = payload as { explanation?: string; reasons?: string[]; weight?: number; signals?: Record<string, any> };
        decoded.push({
          id: r.id,
          fromId: r.from_reflection_id,
          toId: r.to_reflection_id,
          bridge: {
            explanation: narrativePayload.explanation || '',
            reasons: narrativePayload.reasons || [],
            weight: narrativePayload.weight,
            signals: narrativePayload.signals || {},
          },
          bridgeType: 'narrative' as const,
        });
      } else if (payload && typeof payload === 'object' && 'kind' in payload && payload.kind === 'narrative_bridge_v1') {
        // Legacy narrative bridge format (kind-based)
        const narrativePayload = payload as { explanation?: string; reasons?: string[]; weight?: number; signals?: Record<string, any> };
        decoded.push({
          id: r.id,
          fromId: r.from_reflection_id,
          toId: r.to_reflection_id,
          bridge: {
            explanation: narrativePayload.explanation || '',
            reasons: narrativePayload.reasons || [],
            weight: narrativePayload.weight,
            signals: narrativePayload.signals || {},
          },
          bridgeType: 'narrative' as const,
        });
      } else if (payload && typeof payload === 'object' && 'title' in payload && 'claim' in payload) {
        // It's a MeaningBridge
        decoded.push({
          id: r.id,
          fromId: r.from_reflection_id,
          toId: r.to_reflection_id,
          bridge: payload as MeaningBridge,
          bridgeType: 'meaning' as const,
        });
      } else {
        // Unknown bridge type - collect for summary logging
        unknownTypeCount++;
        if (unknownTypeSamples.length < 3) {
          unknownTypeSamples.push(payload);
        }
      }
    } catch (err) {
      console.error('[fetchBridgesForWallet] Failed to decrypt bridge', r.id, err);
      // Skip corrupted bridges
    }
  }
  
  // Log unknown types once per page load with summary
  if (unknownTypeCount > 0) {
    console.warn(`[fetchBridgesForWallet] Skipped ${unknownTypeCount} bridge(s) with unknown type. Samples:`, unknownTypeSamples);
  }
  
  return decoded;
}

// Reason edges live here. Similarity edges are candidates only.
export async function upsertNarrativeBridgeEncrypted(opts: {
  supabase: SupabaseClient;
  wallet: string;
  bridge: NarrativeBridge;
  key: CryptoKey;
}) {
      const payload = {
        explanation: opts.bridge.explanation,
        reasons: opts.bridge.reasons,
        weight: opts.bridge.weight, // Store weight for dev provenance
        signals: opts.bridge.signals || {},
        computedAt: new Date().toISOString(),
        version: "narrative_v1",
      };
  
  const { ciphertext, iv, alg, version } = await encryptJson(payload, opts.key);

  const { data, error } = await opts.supabase
    .from("reflection_link_bridges")
    .upsert({
      wallet_address: opts.wallet,
      from_reflection_id: opts.bridge.from,
      to_reflection_id: opts.bridge.to,
      ciphertext,
      iv,
      alg,
      version: 1, // Store as version 1, payload has narrative_v1
    }, { onConflict: "wallet_address,from_reflection_id,to_reflection_id" })
    .select("id")
    .single();

  if (error) {
    console.error('[narrativeBridges] Failed to store bridge', error);
    throw error;
  }
  
  return data;
}

// Reason edges live here. Similarity edges are candidates only.
export async function upsertNarrativeBridgesBatch(opts: {
  supabase: SupabaseClient;
  wallet: string;
  bridges: NarrativeBridge[];
  key: CryptoKey;
  debug?: boolean;
}): Promise<{ success: number; failed: number }> {
  const { bridges, debug = false } = opts;
  let success = 0;
  let failed = 0;
  
  for (const bridge of bridges) {
    try {
      await upsertNarrativeBridgeEncrypted({
        supabase: opts.supabase,
        wallet: opts.wallet,
        bridge,
        key: opts.key,
      });
      success++;
    } catch (err) {
      failed++;
      if (debug) {
        console.debug('[narrativeBridges] Failed to store bridge', bridge.from, '->', bridge.to, err);
      }
    }
  }
  
  if (debug) {
    console.debug('[narrativeBridges] Stored bridges:', { success, failed, total: bridges.length });
  }
  
  return { success, failed };
}

