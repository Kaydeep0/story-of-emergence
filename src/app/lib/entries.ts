// src/app/lib/entries.ts
import { getSupabaseForWallet } from "./supabase";
import type { EntryRow, Item, ListOptions, ListResult, DecodeResult } from "./types";
import { aesGcmEncryptText, aesGcmDecryptText } from "../../lib/crypto";

// ----- legacy decoder for earliest placeholder rows (plain base64(JSON)) -----
function tryDecodeLegacy(cipher: string): DecodeResult<unknown> {
  try {
    const text = atob(cipher);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

// ----- safe stringify that ignores circular refs and functions -----
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

// ----- real AES-GCM wrappers for new saves, plus legacy read path -----
async function encryptJSON(sessionKey: CryptoKey, obj: unknown): Promise<string> {
  const text = safeStringify(obj);
  // returns "v1:<base64(iv||ciphertext+tag)>"
  return aesGcmEncryptText(sessionKey, text);
}

async function decryptJSON(sessionKey: CryptoKey, cipher: string): Promise<unknown> {
  // New format first
  if (cipher.startsWith("v1:")) {
    const plain = await aesGcmDecryptText(sessionKey, cipher);
    return JSON.parse(plain);
  }
  // Legacy fallback: base64(JSON) used in very early saves
  const legacy = tryDecodeLegacy(cipher);
  if (legacy.ok) return legacy.value;
  return { note: "Unable to decrypt this entry" };
}

// ----- RPC calls -----
export async function rpcFetchEntries(
  wallet: string,
  sessionKey: CryptoKey,
  opts: ListOptions = {}
): Promise<ListResult> {
  const { includeDeleted = false, limit = 20, offset = 0 } = opts;
  const supabase = getSupabaseForWallet(wallet);

  const { data, error } = await supabase
    .rpc("list_entries", { w: wallet, include_deleted: includeDeleted })
    .limit(limit)
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = (data ?? []) as EntryRow[];

  const items: Item[] = await Promise.all(
    rows.map(async (r) => {
      let plaintext: unknown;
      try {
        plaintext = await decryptJSON(sessionKey, r.ciphertext);
      } catch {
        const legacy = tryDecodeLegacy(r.ciphertext);
        plaintext = legacy.ok ? legacy.value : { note: "Unable to decrypt this entry" };
      }
      return {
        id: r.id,
        createdAt: new Date(r.created_at),
        deletedAt: r.deleted_at ? new Date(r.deleted_at) : null,
        plaintext,
      } as Item;
    })
  );

  const nextOffset = rows.length < limit ? null : offset + rows.length;
  return { items, nextOffset };
}

export async function rpcInsertEntry(
  wallet: string,
  sessionKey: CryptoKey,
  obj: unknown
): Promise<{ id: string }> {
  const supabase = getSupabaseForWallet(wallet);
  const cipher = await encryptJSON(sessionKey, obj); // now v1: AES-GCM
  const { data, error } = await supabase.rpc("insert_entry", { w: wallet, cipher });
  if (error) throw error;
  return { id: String(data) };
}

export async function rpcSoftDelete(wallet: string, entryId: string): Promise<void> {
  const supabase = getSupabaseForWallet(wallet);
  const { error } = await supabase.rpc("soft_delete_entry", { w: wallet, entry_id: entryId });
  if (error) throw error;
}

export async function rpcHardDelete(wallet: string, id: string) {
  const sb = getSupabaseForWallet(wallet);
  const { error } = await sb.rpc("delete_entry", {
    eid: id,
    w: wallet.toLowerCase(),
  });
  if (error) throw error;
}


export async function restoreEntryRpc(wallet: string, entryId: string): Promise<void> {
  const supabase = getSupabaseForWallet(wallet);
  const { error } = await supabase.rpc("restore_entry", { w: wallet, entry_id: entryId });
  if (error) throw error;
}
