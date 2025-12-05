// src/app/lib/contacts.ts
// Client-side functions for contacts table (encrypted contact labels)

import { getSupabaseForWallet } from './supabase';
import { aesGcmEncryptText, aesGcmDecryptText } from '../../lib/crypto';

// ----- Types -----

/** Row shape from the contacts table */
export type ContactRow = {
  id: string;
  wallet_address: string;
  contact_wallet: string;
  ciphertext: string;
  created_at: string;
};

/** Payload stored encrypted in ciphertext */
export type ContactPayload = {
  name: string;
};

/** Decrypted contact with name extracted */
export type ContactDecrypted = {
  id: string;
  contactWallet: string;
  name: string;
  createdAt: string;
};

// ----- Encrypt/decrypt helpers -----

async function encryptPayload(sessionKey: CryptoKey, payload: ContactPayload): Promise<string> {
  const text = JSON.stringify(payload);
  return aesGcmEncryptText(sessionKey, text);
}

async function decryptPayload(sessionKey: CryptoKey, cipher: string): Promise<ContactPayload> {
  if (cipher.startsWith('v1:')) {
    const plain = await aesGcmDecryptText(sessionKey, cipher);
    return JSON.parse(plain) as ContactPayload;
  }
  // Fallback for unexpected format
  return { name: '' };
}

// ----- RPC calls -----

/**
 * List all contacts for the given wallet
 * Returns raw ContactRow[] - caller should decrypt as needed
 */
export async function rpcListContacts(
  wallet: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<ContactRow[]> {
  const { limit = 100, offset = 0 } = opts;
  const supabase = getSupabaseForWallet(wallet);

  const { data, error } = await supabase.rpc('list_contacts', {
    w: wallet.toLowerCase(),
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return (data ?? []) as ContactRow[];
}

/**
 * List contacts and decrypt them into ContactDecrypted[]
 */
export async function rpcListContactsDecrypted(
  wallet: string,
  sessionKey: CryptoKey,
  opts: { limit?: number; offset?: number } = {}
): Promise<ContactDecrypted[]> {
  const rows = await rpcListContacts(wallet, opts);

  const contacts: ContactDecrypted[] = await Promise.all(
    rows.map(async (r) => {
      let name = '';
      try {
        const payload = await decryptPayload(sessionKey, r.ciphertext);
        name = payload.name || '';
      } catch {
        // Decryption failed - leave name empty
      }
      return {
        id: r.id,
        contactWallet: r.contact_wallet,
        name,
        createdAt: r.created_at,
      };
    })
  );

  return contacts;
}

/**
 * Insert or update a contact (upsert by wallet + contact_wallet)
 * Returns the contact id
 */
export async function rpcInsertContact(
  wallet: string,
  sessionKey: CryptoKey,
  contactWallet: string,
  name: string
): Promise<string> {
  const supabase = getSupabaseForWallet(wallet);

  const payload: ContactPayload = { name };
  const ciphertext = await encryptPayload(sessionKey, payload);

  const { data, error } = await supabase.rpc('insert_contact', {
    p_wallet: wallet.toLowerCase(),
    p_contact_wallet: contactWallet.toLowerCase(),
    p_ciphertext: ciphertext,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Delete a contact by id
 */
export async function rpcDeleteContact(
  wallet: string,
  contactId: string
): Promise<void> {
  const supabase = getSupabaseForWallet(wallet);

  const { error } = await supabase.rpc('delete_contact', {
    w: wallet.toLowerCase(),
    p_contact_id: contactId,
  });

  if (error) throw error;
}

/**
 * Build a map from lowercase contact_wallet to ContactDecrypted
 * Useful for looking up contact names by wallet address
 */
export function buildContactsMap(
  contacts: ContactDecrypted[]
): Map<string, ContactDecrypted> {
  const map = new Map<string, ContactDecrypted>();
  for (const c of contacts) {
    map.set(c.contactWallet.toLowerCase(), c);
  }
  return map;
}

