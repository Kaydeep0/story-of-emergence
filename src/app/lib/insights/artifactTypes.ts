// src/app/lib/insights/artifactTypes.ts
// Canonical model for all computed insights
// Used by Weekly, Yearly, Lifetime, and Year over Year

import type { InsightCard } from './types';
import type { PatternNarrative } from '../../patternMemory/patternNarratives';

/**
 * Time horizon for insight computation
 */
export type InsightHorizon = 'weekly' | 'yearly' | 'lifetime' | 'yoy';

/**
 * Canonical insight artifact model
 * All computed insights follow this structure regardless of horizon
 */
export type InsightArtifact = {
  id: string;
  horizon: InsightHorizon;
  window: {
    startISO: string;
    endISO: string;
    timezone?: string;
  };
  createdAtISO: string;
  cards: InsightCard[];
  meta: {
    wallet?: string;
    entriesCount?: number;
    eventsCount?: number;
    version: number;
  };
  /** Phase 5.4: Optional pattern narratives attached to artifact (not used by UI yet) */
  narratives?: PatternNarrative[];
};

