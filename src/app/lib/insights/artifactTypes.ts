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
};

