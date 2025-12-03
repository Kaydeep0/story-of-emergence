// src/app/lib/insights/types.ts
// Shared types for the client-side insight engine

/**
 * A decrypted reflection entry available in memory
 * This represents entries that have already been decrypted client-side
 */
export type ReflectionEntry = {
  id: string;
  createdAt: string; // ISO string
  updatedAt?: string;
  deletedAt?: string | null;
  // Decrypted content - the actual text the user wrote
  plaintext: string;
};

/**
 * Evidence linking an insight back to specific entries
 */
export type InsightEvidence = {
  entryId: string;
  timestamp: string; // ISO
  preview?: string; // Optional short preview of the entry content
};

/**
 * Available insight kinds
 */
export type InsightKind =
  | 'timeline_spike'
  | 'quiet_period'
  | 'topic_cluster'
  | 'always_on_summary';

/**
 * Base insight card type
 * All insights share this structure
 */
export type InsightCard = {
  id: string;
  kind: InsightKind;
  title: string;
  explanation: string;
  evidence: InsightEvidence[];
  computedAt: string; // ISO timestamp when this insight was generated
};

/**
 * Timeline spike specific data
 */
export type TimelineSpikeData = {
  date: string; // YYYY-MM-DD
  count: number;
  medianCount: number;
  multiplier: number; // how many times above median
};

/**
 * Extended insight card for timeline spikes
 */
export type TimelineSpikeCard = InsightCard & {
  kind: 'timeline_spike';
  data: TimelineSpikeData;
};

/**
 * Always-on summary specific data
 */
export type AlwaysOnSummaryData = {
  summaryType: 'writing_change' | 'consistency';
  currentWeekEntries: number;
  previousWeekEntries: number;
  currentWeekActiveDays: number;
  percentChange?: number;
  activeDayNames?: string[];
};

/**
 * Extended insight card for always-on summary
 */
export type AlwaysOnSummaryCard = InsightCard & {
  kind: 'always_on_summary';
  data: AlwaysOnSummaryData;
};

/**
 * A snapshot of a highlighted insight card
 * Stored in localStorage for persistence
 */
export type HighlightSnapshot = {
  id: string;                 // original InsightCard id
  kind: InsightKind;          // "timeline_spike" or "always_on_summary"
  title: string;
  explanation: string;
  computedAt: string;         // when the insight was computed
  createdAt: string;          // when it was highlighted (ISO timestamp)
};

