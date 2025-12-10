// src/app/lib/insightEngine.ts
// Insight Engine shell - prepares structure for future analysis

import type { InternalEvent } from './types';
import type { UnifiedInternalEvent } from '../../lib/internalEvents';
import type { ExternalEntry } from '../../lib/sources';
import { listExternalEntries } from './useSources';

export type TimelineInsight = {
  id: string;
  eventAt: Date;
  eventType: string;
  source: string | null;
  metadata: Record<string, unknown>;
};

export type SummaryInsight = {
  streak: number;
  totalEntries: number;
  totalEvents: number;
  avgEntriesPerWeek: number;
  topSources: string[];
  lastActiveAt: Date | null;
  activityHeatmap: Record<string, number>; // day -> count
};

/**
 * Insight Engine State
 * Tracks reflections and external entries for unified processing
 */
export type InsightEngineState = {
  reflections: unknown[]; // Will be typed properly in Phase Two
  external: ExternalEntry[];
  status: 'idle' | 'loading' | 'ready' | 'error';
};

/**
 * Load external entries and update engine state
 * This function loads external entries after reflections are loaded
 * 
 * @param wallet - wallet address
 * @param state - current engine state (will be managed by hook in future)
 * @returns Updated state with external entries
 */
export async function loadExternalEntriesForEngine(
  wallet: string,
  state: InsightEngineState
): Promise<InsightEngineState> {
  try {
    const external = await listExternalEntries(wallet);
    return {
      ...state,
      external,
      status: 'ready',
    };
  } catch (error) {
    console.error('[insightEngine] Failed to load external entries:', error);
    return {
      ...state,
      status: 'error',
    };
  }
}

/**
 * Process internal events into timeline insights
 * Accepts either legacy InternalEvent[] or UnifiedInternalEvent[].
 * Currently returns empty array - will be implemented in Phase Two
 *
 * @param events - List of internal events (legacy or unified)
 * @returns Timeline insights for display
 */
export function runTimelineInsights(
  events: InternalEvent[] | UnifiedInternalEvent[]
): TimelineInsight[] {
  // Phase Two: This will analyze events and extract meaningful timeline data
  // For now, return empty array as a scaffold
  void events; // Suppress unused parameter warning
  return [];
}

/**
 * Process internal events into summary insights
 * Accepts either legacy InternalEvent[] or UnifiedInternalEvent[].
 * Currently returns empty object - will be implemented in Phase Two
 *
 * @param events - List of internal events (legacy or unified)
 * @returns Summary insights with aggregated statistics
 */
export function runSummaryInsights(
  events: InternalEvent[] | UnifiedInternalEvent[]
): Partial<SummaryInsight> {
  // Phase Two: This will compute streaks, averages, and patterns
  // For now, return empty partial as a scaffold
  void events; // Suppress unused parameter warning
  return {};
}

/**
 * Calculate writing streak from events
 * Accepts either legacy InternalEvent[] or UnifiedInternalEvent[].
 * Streak = consecutive days with at least one journal event
 *
 * @param events - List of internal events (legacy or unified)
 * @returns Number of consecutive days
 */
export function calculateStreak(
  events: InternalEvent[] | UnifiedInternalEvent[]
): number {
  // Phase Two: Implement streak calculation
  void events; // Suppress unused parameter warning
  return 0;
}

/**
 * Extract topic trends from events over time
 * Accepts either legacy InternalEvent[] or UnifiedInternalEvent[].
 *
 * @param events - List of internal events (legacy or unified)
 * @returns Map of topic -> count
 */
export function extractTopicTrends(
  events: InternalEvent[] | UnifiedInternalEvent[]
): Map<string, number> {
  // Phase Two: Implement topic extraction and counting
  void events; // Suppress unused parameter warning
  return new Map();
}

/**
 * Detect activity spikes - days with unusually high activity
 * Accepts either legacy InternalEvent[] or UnifiedInternalEvent[].
 *
 * @param events - List of internal events (legacy or unified)
 * @returns List of dates with spikes
 */
export function detectActivitySpikes(
  events: InternalEvent[] | UnifiedInternalEvent[]
): Date[] {
  // Phase Two: Implement spike detection algorithm
  void events; // Suppress unused parameter warning
  return [];
}

