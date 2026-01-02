// src/app/lib/insights/computeInsightsForWindow.ts
// Canonical insight engine entry point
// Phase 4.2: Single source of truth for insight computation

import type { InsightArtifact, InsightHorizon } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { computeWeeklyArtifact } from './computeWeeklyArtifact';
import { extractPatternsFromArtifact } from './patterns/extractPatterns';
import { snapshotPatterns } from '../patternMemory/patternSnapshot';
import { analyzePatternDeltas } from '../patternMemory/patternDelta';
import { generatePatternNarratives } from '../patternMemory/patternNarratives';
import { selectNarratives } from '../patternMemory/selectNarratives';
import { attachNarrativesToArtifact } from '../patternMemory/attachNarratives';

/**
 * Canonical engine entry point for computing insights
 * 
 * This is the SINGLE SOURCE OF TRUTH for insight computation.
 * All insight computation should route through this function.
 * 
 * @param args - Configuration for insight computation
 * @returns InsightArtifact with cards ordered as expected for the horizon
 */
export function computeInsightsForWindow(args: {
  horizon: InsightHorizon;
  events: (InternalEvent | UnifiedInternalEvent)[];
  windowStart: Date;
  windowEnd: Date;
  timezone?: string;
  wallet?: string;
  entriesCount?: number;
  eventsCount?: number;
  previousSnapshots?: Array<import('../patternMemory/patternSnapshot').PatternSnapshot>;
}): InsightArtifact {
  const { horizon, events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount, previousSnapshots = [] } = args;
  
  let artifact: InsightArtifact;
  
  if (horizon === 'weekly') {
    artifact = computeWeeklyArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
    });
  } else {
    // Other horizons (yearly, lifetime, yoy) will be implemented in future phases
    throw new Error(`Horizon ${horizon} not yet implemented in engine`);
  }
  
  // Phase 5.4-5.5: Attach narratives to artifact (single integration point)
  // Extract patterns, generate snapshots, analyze deltas, generate narratives, select, attach
  try {
    const currentPatterns = extractPatternsFromArtifact(artifact);
    const currentSnapshots = snapshotPatterns(previousSnapshots, currentPatterns.patterns, 'week');
    const deltas = analyzePatternDeltas(previousSnapshots, currentSnapshots);
    const narratives = generatePatternNarratives(deltas);
    // Phase 5.5: Select most important narratives before attaching
    const selectedNarratives = selectNarratives(narratives);
    artifact = attachNarrativesToArtifact(artifact, selectedNarratives);
  } catch {
    // If narrative generation fails, silently skip attach (guardrail)
    // Artifact is returned unchanged
  }
  
  return artifact;
}

