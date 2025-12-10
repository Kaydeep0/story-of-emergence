// src/app/lib/internalEvents.ts
// Client-side functions for internal_events table (Phase One insight engine)

'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getSupabaseForWallet } from "./supabase";
import { useEncryptionSession } from './useEncryptionSession';
import type {
  InternalEventRow,
  InternalEvent,
  InternalEventListOptions,
  InternalEventListResult,
  InternalEventRangeOptions,
} from "./types";
import { aesGcmEncryptText, aesGcmDecryptText } from "../../lib/crypto";

// ----- safe stringify that ignores circular refs and functions -----
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === "function") return undefined;
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return undefined;
      seen.add(value);
    }
    return value;
  });
}

// ----- AES-GCM wrappers -----
async function encryptJSON(sessionKey: CryptoKey, obj: unknown): Promise<string> {
  const text = safeStringify(obj);
  // returns "v1:<base64(iv||ciphertext+tag)>"
  return aesGcmEncryptText(sessionKey, text);
}

async function decryptJSON(sessionKey: CryptoKey, cipher: string): Promise<unknown> {
  if (cipher.startsWith("v1:")) {
    const plain = await aesGcmDecryptText(sessionKey, cipher);
    return JSON.parse(plain);
  }
  // Fallback for unknown formats
  return { error: "Unable to decrypt this event" };
}

// ----- RPC calls -----

/**
 * Insert a new internal event (encrypted client-side)
 * @param wallet - wallet address
 * @param sessionKey - AES key derived from consent signature
 * @param eventAt - timestamp for the event
 * @param payload - arbitrary JSON payload to encrypt
 * @returns the inserted row with id
 */
export async function rpcInsertInternalEvent(
  wallet: string,
  sessionKey: CryptoKey,
  eventAt: Date,
  payload: unknown
): Promise<InternalEvent> {
  const supabase = getSupabaseForWallet(wallet);
  const cipher = await encryptJSON(sessionKey, payload);

  const { data, error } = await supabase.rpc("insert_internal_event", {
    w: wallet.toLowerCase(),
    p_event_at: eventAt.toISOString(),
    p_ciphertext: cipher,
    p_encryption_version: 1,
  });

  if (error) throw error;

  const row = data as InternalEventRow;

  return {
    id: row.id,
    eventAt: new Date(row.event_at),
    createdAt: new Date(row.created_at),
    plaintext: payload, // we just encrypted it, so we know the plaintext
  };
}

/**
 * List internal events with pagination, ordered by event_at desc
 * @param wallet - wallet address
 * @param sessionKey - AES key for decryption
 * @param opts - pagination options (limit, offset)
 */
export async function rpcListInternalEvents(
  wallet: string,
  sessionKey: CryptoKey,
  opts: InternalEventListOptions = {}
): Promise<InternalEventListResult> {
  const { limit = 50, offset = 0 } = opts;
  const supabase = getSupabaseForWallet(wallet);

  const { data, error } = await supabase.rpc("list_internal_events", {
    w: wallet.toLowerCase(),
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as InternalEventRow[];

  const items: InternalEvent[] = await Promise.all(
    rows.map(async (r) => {
      let plaintext: unknown;
      try {
        plaintext = await decryptJSON(sessionKey, r.ciphertext);
      } catch {
        plaintext = { error: "Unable to decrypt this event" };
      }
      return {
        id: r.id,
        eventAt: new Date(r.event_at),
        createdAt: new Date(r.created_at),
        plaintext,
      };
    })
  );

  const nextOffset = rows.length < limit ? null : offset + rows.length;
  return { items, nextOffset };
}

/**
 * List internal events within a time range, ordered by event_at desc
 * @param wallet - wallet address
 * @param sessionKey - AES key for decryption
 * @param opts - start and end timestamps
 */
export async function rpcListInternalEventsByRange(
  wallet: string,
  sessionKey: CryptoKey,
  opts: InternalEventRangeOptions
): Promise<InternalEvent[]> {
  const { start, end } = opts;
  const supabase = getSupabaseForWallet(wallet);

  const { data, error } = await supabase.rpc("list_internal_events_by_range", {
    w: wallet.toLowerCase(),
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) throw error;

  const rows = (data ?? []) as InternalEventRow[];

  const items: InternalEvent[] = await Promise.all(
    rows.map(async (r) => {
      let plaintext: unknown;
      try {
        plaintext = await decryptJSON(sessionKey, r.ciphertext);
      } catch {
        plaintext = { error: "Unable to decrypt this event" };
      }
      return {
        id: r.id,
        eventAt: new Date(r.event_at),
        createdAt: new Date(r.created_at),
        plaintext,
      };
    })
  );

  return items;
}

// ----- Hook for debug strip -----

/**
 * Hook to access internal events for debug purposes
 * Returns events array
 */
export function useInternalEvents() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const [events, setEvents] = useState<InternalEvent[]>([]);

  useEffect(() => {
    if (!isConnected || !address || !encryptionReady || !sessionKey) {
      setEvents([]);
      return;
    }

    // Load events for debug strip
    rpcListInternalEvents(address, sessionKey, { limit: 500, offset: 0 })
      .then((result) => {
        setEvents(result.items);
      })
      .catch((err) => {
        console.error('[useInternalEvents] Failed to load events:', err);
        setEvents([]);
      });
  }, [isConnected, address, encryptionReady, sessionKey]);

  return { events };
}
