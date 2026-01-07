// src/app/lib/insights/artifactTypes.ts
// Canonical model for all computed insights
// Used by Weekly, Yearly, Lifetime, and Year over Year

import type { InsightCard } from './types';
import type { PatternNarrative } from '../patternMemory/patternNarratives';

/**
 * Time horizon for insight computation
 */
export type InsightHorizon = 'weekly' | 'summary' | 'timeline' | 'yearly' | 'lifetime' | 'yoy' | 'distributions';

/**
 * Rejected card with validation reasons
 */
export type RejectedCard = {
  title: string;
  kind: string;
  reasons: string[];
};

/**
 * Debug information attached to artifacts for development
 */
export type InsightArtifactDebug = {
  eventCount: number;
  windowStartIso: string;
  windowEndIso: string;
  minEventIso: string | null;
  maxEventIso: string | null;
  sampleEventIds: string[];
  sampleEventDates: string[];
  /** Dev-only: Reflection intake counters */
  reflectionsLoaded?: number;
  eventsGenerated?: number;
  /** Insight Contract validation telemetry */
  reflectionsInWindow?: number;
  activeDays?: number;
  rawCardsGenerated?: number;
  cardsPassingValidation?: number;
  rejectedCards?: RejectedCard[];
  timezone?: string;
  invalidReflectionDates?: number;
  sampleInvalidDateRaw?: string;
  /** Data integrity: events that don't have corresponding reflections */
  missingReflectionsForEvents?: number;
};

/**
 * Observer v1: Pattern persistence recognition result
 * 
 * Attached to artifact when pattern persistence is detected.
 * See docs/PATTERN_PERSISTENCE_RULE.md for when this is populated.
 */
export type ObserverPersistenceResult = {
  /** The pattern signature that persists */
  signature: {
    observedDistributionFit: 'normal' | 'lognormal' | 'powerlaw';
    concentrationRatio: number;
    dayOfWeekPattern: number[]; // Array of day numbers (0-6)
    topPercentileShare: number;
    relativeSpikeThreshold: number;
  };
  /** Lens names where the pattern appears */
  lenses: [string, string];
  /** Window start dates (ISO strings) */
  windowStarts: [string, string];
  /** Window end dates (ISO strings) */
  windowEnds: [string, string];
  /** Persistence statement (single sentence) */
  statement: string;
};

/**
 * Canonical insight artifact model
 * All computed insights follow this structure regardless of horizon
 */
export type InsightArtifact = {
  horizon: InsightHorizon;
  window: {
    kind: 'week' | 'month' | 'year' | 'custom';
    start: string; // ISO string
    end: string; // ISO string
    timezone?: string;
  };
  createdAt: string; // ISO string
  cards: InsightCard[];
  /** Phase 5.4: Optional pattern narratives attached to artifact */
  narratives?: PatternNarrative[];
  /** Debug information for development */
  debug?: InsightArtifactDebug;
  /** Observer v1: Pattern persistence recognition result (null by default) */
  persistence?: ObserverPersistenceResult | null;
};

