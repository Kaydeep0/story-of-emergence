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

// ---- Event Payload Types ----
// These represent the possible shapes of the plaintext field in InternalEvent

import type { ExternalSourceKind } from '../../lib/sources';

export type InternalEventPayload =
  | { type: 'reflection_saved'; id: string }
  | { type: 'source_imported'; id: string; kind: ExternalSourceKind }
  | { type: 'insight_viewed'; insight: string }
  | { type: 'reflection_deleted'; id: string }
  | { type: 'reflection_restored'; id: string }
  | { type: 'draft_created'; id: string }
  | { type: 'draft_deleted'; id: string }
  | { type: 'export_triggered' }
  | { type: 'page_reflections' }
  | { type: 'page_insights' }
  | { type: 'page_sources' }
  | { type: 'page_shared' }
  | { type: 'navigate_sources' }
  | { type: 'capsule_open_success'; shareId: string }
  | { type: 'capsule_open_failed'; shareId: string }
  | { type: 'share_accepted'; shareId: string }
  | { type: 'share_dismissed'; shareId: string }
  | { type: 'share_created'; shareId: string }
  | { type: 'share_opened'; shareId: string }
  | Record<string, unknown>; // Fallback for unknown event types
