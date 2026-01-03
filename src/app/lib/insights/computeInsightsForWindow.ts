// src/app/lib/insights/computeInsightsForWindow.ts
// Canonical insight engine entry point
// Phase 4.2: Single source of truth for insight computation

import type { InsightArtifact, InsightHorizon } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { computeWeeklyArtifact } from './computeWeeklyArtifact';
import { computeSummaryArtifact } from './computeSummaryArtifact';
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
  } else if (horizon === 'summary') {
    artifact = computeSummaryArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
    });
  } else if (horizon === 'timeline') {
    // Timeline horizon: Use simplified artifact from timeline insights
    // For now, create a minimal artifact structure
    // TODO: Create computeTimelineArtifact function similar to computeWeeklyArtifact
    artifact = {
      horizon: 'timeline',
      window: {
        kind: 'custom',
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      },
      createdAt: new Date().toISOString(),
      cards: [], // Timeline cards are computed separately via computeTimelineInsights
    };
  } else {
    // Yearly, lifetime, yoy: Not supported through engine yet (use separate pages)
    throw new Error(`Horizon ${horizon} not yet implemented in engine. Use dedicated page routes instead.`);
  }
  
  // Phase 5.4-5.5: Attach narratives to artifact (single integration point)
  // Extract patterns, generate snapshots, analyze deltas, generate narratives, select, attach
  // Task F: Expand Pattern Narratives beyond Weekly
  try {
    const currentPatterns = extractPatternsFromArtifact(artifact);
    
    // Determine window kind based on horizon
    let windowKind: 'week' | 'month' | 'year' = 'week';
    if (horizon === 'summary') {
      windowKind = 'week'; // Summary uses weekly windows
    } else if (horizon === 'timeline') {
      windowKind = 'month'; // Timeline uses monthly windows
    }
    
    const currentSnapshots = snapshotPatterns(previousSnapshots, currentPatterns.patterns, windowKind);
    const deltas = analyzePatternDeltas(previousSnapshots, currentSnapshots);
    const narratives = generatePatternNarratives(deltas);
    
    // Phase 5.5: Select most important narratives before attaching
    // For summary and timeline, use simplified selection (fewer narratives)
    const maxNarratives = horizon === 'weekly' ? 3 : 2;
    const selectedNarratives = selectNarratives(narratives, { maxNarratives });
    artifact = attachNarrativesToArtifact(artifact, selectedNarratives);
  } catch {
    // If narrative generation fails, silently skip attach (guardrail)
    // Artifact is returned unchanged
  }
  
  return artifact;
}

