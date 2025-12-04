// src/lib/internalEvents.ts
// Unified internal event types for Phase Two
// This module defines the canonical shape for all internal events going forward.

// ----- Unified Internal Event Types -----

export type SourceKind =
  | "journal"
  | "navigation"
  | "system"
  | "youtube"
  | "x"
  | "linkedin"
  | "google_history"
  | "rss"
  | "document"
  | "other";

export type EventKind =
  | "written"
  | "viewed"
  | "liked"
  | "searched"
  | "saved"
  | "posted"
  | "opened"
  | "attached"
  | "navigation"
  | "system";

export type UnifiedInternalEvent = {
  id: string;
  walletAlias: string;
  eventAt: string;        // ISO timestamp
  sourceKind: SourceKind; // journal, youtube, x, etc
  eventKind: EventKind;   // written, viewed, navigation, etc

  // Current Phase One fields should map cleanly into these
  label?: string;         // event label or title
  details?: string;       // optional text details
  url?: string | null;    // optional URL for external items

  // Optional tags for future use
  topics?: string[];          // string tags
  attentionType?: string | null; // learning, escapism, etc
  rawMetadata?: unknown;      // underlying payload
};

// ----- Legacy type alias for backwards compatibility -----

/**
 * The old InternalEvent shape (decrypted from DB).
 * Kept as an alias for existing code paths.
 */
export type LegacyInternalEvent = {
  id: string;
  eventAt: Date;
  createdAt: Date;
  plaintext: unknown;
};

// ----- Helper functions to convert between formats -----

/**
 * Convert a legacy InternalEvent (decrypted from DB) to UnifiedInternalEvent.
 * Maps existing event payloads to the new unified structure.
 *
 * @param event - The legacy InternalEvent with decrypted plaintext
 * @param walletAlias - The wallet address or alias
 * @returns UnifiedInternalEvent with proper sourceKind and eventKind
 */
export function toUnifiedInternalEvent(
  event: LegacyInternalEvent,
  walletAlias: string
): UnifiedInternalEvent {
  const payload: Record<string, unknown> =
    typeof event.plaintext === "object" && event.plaintext !== null
      ? (event.plaintext as Record<string, unknown>)
      : {};

  // Extract existing fields from payload
  const existingSourceKind = payload.source_kind as string | undefined;
  const existingEventKind = payload.event_kind as string | undefined;
  const existingEventType = payload.event_type as string | undefined;

  // Determine sourceKind based on existing data
  let sourceKind: SourceKind = "other";
  if (existingSourceKind === "journal") {
    sourceKind = "journal";
  } else if (existingSourceKind === "navigation") {
    sourceKind = "navigation";
  } else if (existingSourceKind === "system") {
    sourceKind = "system";
  } else if (existingEventType?.startsWith("page_")) {
    // Navigation events like page_reflections, page_insights, page_sources
    sourceKind = "navigation";
  } else if (
    existingEventType === "reflection_saved" ||
    existingEventType === "reflection_deleted" ||
    existingEventType === "reflection_restored" ||
    existingEventType === "draft_created" ||
    existingEventType === "draft_deleted"
  ) {
    sourceKind = "journal";
  } else if (existingEventType === "export_triggered") {
    sourceKind = "system";
  }

  // Determine eventKind based on existing data
  let eventKind: EventKind = "system";
  if (existingEventKind === "written") {
    eventKind = "written";
  } else if (existingEventKind === "navigation") {
    eventKind = "navigation";
  } else if (existingEventType?.startsWith("page_")) {
    eventKind = "navigation";
  } else if (
    existingEventType === "reflection_saved" ||
    existingEventType === "draft_created"
  ) {
    eventKind = "written";
  } else if (
    existingEventType === "reflection_deleted" ||
    existingEventType === "reflection_restored" ||
    existingEventType === "draft_deleted" ||
    existingEventType === "export_triggered"
  ) {
    eventKind = "system";
  }

  // Extract label from event_type or label field
  const label =
    (payload.label as string | undefined) ??
    existingEventType ??
    existingEventKind ??
    undefined;

  // Extract details/content if present
  const details =
    (payload.details as string | undefined) ??
    (payload.content as string | undefined) ??
    (payload.message as string | undefined) ??
    undefined;

  // Extract URL if present
  const url = (payload.url as string | undefined) ?? null;

  // Extract topics if present
  const topics = Array.isArray(payload.topics)
    ? (payload.topics as unknown[]).filter((t): t is string => typeof t === "string")
    : undefined;

  // Extract attention type if present
  const attentionType = (payload.attention_type as string | undefined) ?? null;

  return {
    id: event.id,
    walletAlias,
    eventAt: event.eventAt.toISOString(),
    sourceKind,
    eventKind,
    label,
    details,
    url,
    topics: topics && topics.length > 0 ? topics : undefined,
    attentionType,
    rawMetadata: Object.keys(payload).length > 0 ? payload : undefined,
  };
}

/**
 * Convert an array of legacy InternalEvents to UnifiedInternalEvents.
 *
 * @param events - Array of legacy InternalEvents
 * @param walletAlias - The wallet address or alias
 * @returns Array of UnifiedInternalEvents
 */
export function toUnifiedInternalEvents(
  events: LegacyInternalEvent[],
  walletAlias: string
): UnifiedInternalEvent[] {
  return events.map((ev) => toUnifiedInternalEvent(ev, walletAlias));
}

/**
 * Extract the eventAt as a Date from a UnifiedInternalEvent.
 * Useful when you need to work with Date objects.
 */
export function getEventAtDate(event: UnifiedInternalEvent): Date {
  return new Date(event.eventAt);
}

