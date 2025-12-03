// src/app/lib/types.ts

export type UUID = string;

// Exact table shape returned by list_entries
export type EntryRow = {
  id: UUID;
  wallet_address: string;
  ciphertext: string;
  created_at: string;     // ISO string from server
  deleted_at: string | null;
};

// Decrypted item for the UI
export type Item = {
  id: UUID;
  createdAt: Date;
  deletedAt: Date | null;
  plaintext: unknown;     // your decrypted JSON
};

export type ListOptions = {
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
};

export type ListResult = {
  items: Item[];
  nextOffset: number | null; // for simple pagination
};

export type DecodeResult<T> =
  | { ok: true; value: T }
  | { ok: false };

// ---- Internal Events (Phase One insight engine) ----

// Exact table shape returned by list_internal_events RPCs
export type InternalEventRow = {
  id: UUID;
  wallet_address: string;
  event_at: string;           // ISO timestamp from server
  ciphertext: string;
  encryption_version: number;
  created_at: string;         // ISO timestamp from server
};

// Decrypted internal event for the UI
export type InternalEvent = {
  id: UUID;
  eventAt: Date;
  createdAt: Date;
  plaintext: unknown;         // decrypted JSON payload
};

export type InternalEventListOptions = {
  limit?: number;
  offset?: number;
};

export type InternalEventListResult = {
  items: InternalEvent[];
  nextOffset: number | null;
};

export type InternalEventRangeOptions = {
  start: Date;
  end: Date;
};
