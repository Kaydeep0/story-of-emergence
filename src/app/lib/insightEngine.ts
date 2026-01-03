// src/app/lib/insightEngine.ts
// Canonical Insight Engine - Single Source of Truth for Insight Computation
// Phase 4.0: Consolidates all insight computation into one orchestration point

import type { ReflectionEntry } from './insights/types';
import type { TimelineSpikeCard, AlwaysOnSummaryCard, LinkClusterCard } from './insights/types';
import type { TopicDriftBucket } from './insights/topicDrift';
import type { ContrastPair } from './insights/contrastPairs';
import type { InsightArtifact, InsightHorizon } from './insights/artifactTypes';
import type { InternalEvent } from './types';
import type { UnifiedInternalEvent } from '../../lib/internalEvents';
import type { ExternalEntry } from '../../lib/sources';

// Import pure compute functions (keep them pure, only orchestrate here)
import { computeTimelineSpikes } from './insights/timelineSpikes';
import { computeAlwaysOnSummary } from './insights/alwaysOnSummary';
import { computeLinkClusters } from './insights/linkClusters';
import { computeTopicDrift } from './insights/topicDrift';
import { computeContrastPairs } from './insights/contrastPairs';
import { computeInsightsForWindow } from './insights/computeInsightsForWindow';

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
 * Result of timeline insight computation
 */
export interface TimelineInsightResult {
  spikes: TimelineSpikeCard[];
  clusters: LinkClusterCard[];
  topicDrift: TopicDriftBucket[];
  contrastPairs: ContrastPair[];
}

/**
 * Result of summary insight computation
 */
export interface SummaryInsightResult {
  alwaysOnSummary: AlwaysOnSummaryCard[];
  topicDrift: TopicDriftBucket[];
}

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
    const { listExternalEntries } = await import('./useSources');
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
 * Canonical engine function for computing timeline insights
 * 
 * This is the SINGLE SOURCE OF TRUTH for timeline insight computation.
 * All timeline insight computation should route through this function.
 * 
 * @param reflectionEntries - Array of decrypted reflection entries
 * @returns TimelineInsightResult with all timeline insights
 */
export function computeTimelineInsights(
  reflectionEntries: ReflectionEntry[]
): TimelineInsightResult {
  // Call pure compute functions (keep them pure, only orchestrate here)
  const spikes = computeTimelineSpikes(reflectionEntries);
  const clusters = computeLinkClusters(reflectionEntries);
  const drift = computeTopicDrift(reflectionEntries);
  const contrasts = computeContrastPairs(drift);

  return {
    spikes,
    clusters,
    topicDrift: drift,
    contrastPairs: contrasts,
  };
}

/**
 * Canonical engine function for computing summary insights
 * 
 * This is the SINGLE SOURCE OF TRUTH for summary insight computation.
 * All summary insight computation should route through this function.
 * 
 * @param reflectionEntries - Array of decrypted reflection entries
 * @returns SummaryInsightResult with all summary insights
 */
export function computeSummaryInsights(
  reflectionEntries: ReflectionEntry[]
): SummaryInsightResult {
  // Call pure compute functions (keep them pure, only orchestrate here)
  const alwaysOnSummary = computeAlwaysOnSummary(reflectionEntries);
  const topicDrift = computeTopicDrift(reflectionEntries);

  return {
    alwaysOnSummary,
    topicDrift,
  };
}

/**
 * Canonical engine function for computing window-based insights (Weekly, Yearly, Lifetime, YoY)
 * 
 * This is the SINGLE SOURCE OF TRUTH for window-based insight computation.
 * All window-based insight computation should route through this function.
 * 
 * @param args - Configuration for window-based insight computation
 * @returns InsightArtifact with cards ordered as expected for the horizon
 */
export function computeWindowInsights(args: {
  horizon: InsightHorizon;
  events: (InternalEvent | UnifiedInternalEvent)[];
  windowStart: Date;
  windowEnd: Date;
  timezone?: string;
  wallet?: string;
  entriesCount?: number;
  eventsCount?: number;
  previousSnapshots?: Array<import('./patternMemory/patternSnapshot').PatternSnapshot>;
}): InsightArtifact {
  // Delegate to canonical computeInsightsForWindow (already handles narratives, patterns, etc.)
  return computeInsightsForWindow(args);
}

/**
 * Legacy functions kept for backward compatibility (deprecated)
 * These will be removed in future phases once all views use the engine
 */

/**
 * @deprecated Use computeTimelineInsights instead
 * Process internal events into timeline insights
 */
export function runTimelineInsights(
  events: InternalEvent[] | UnifiedInternalEvent[]
): Array<{ id: string; eventAt: Date; eventType: string; source: string | null; metadata: Record<string, unknown> }> {
  // Legacy stub - return empty array
  void events;
  return [];
}

/**
 * @deprecated Use computeSummaryInsights instead
 * Process internal events into summary insights
 */
export function runSummaryInsights(
  events: InternalEvent[] | UnifiedInternalEvent[]
): Partial<{ streak: number; totalEntries: number; totalEvents: number; avgEntriesPerWeek: number; topSources: string[]; lastActiveAt: Date | null; activityHeatmap: Record<string, number> }> {
  // Legacy stub - return empty object
  void events;
  return {};
}

/**
 * @deprecated Will be implemented in future phases
 * Calculate writing streak from events
 */
export function calculateStreak(
  events: InternalEvent[] | UnifiedInternalEvent[]
): number {
  void events;
  return 0;
}

/**
 * @deprecated Will be implemented in future phases
 * Extract topic trends from events over time
 */
export function extractTopicTrends(
  events: InternalEvent[] | UnifiedInternalEvent[]
): Map<string, number> {
  void events;
  return new Map();
}

/**
 * @deprecated Will be implemented in future phases
 * Detect activity spikes - days with unusually high activity
 */
export function detectActivitySpikes(
  events: InternalEvent[] | UnifiedInternalEvent[]
): Date[] {
  void events;
  return [];
}
