// src/app/lib/insights/computeSummaryArtifact.ts
// Compute Summary InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeAlwaysOnSummary } from './alwaysOnSummary';


/**
 * Compute Summary InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - computeAlwaysOnSummary for summary insights
 * 
 * Returns InsightArtifact with cards ordered as UI expects
 */
export function computeSummaryArtifact(args: {
  events: (InternalEvent | UnifiedInternalEvent)[];
  windowStart: Date;
  windowEnd: Date;
  timezone?: string;
  wallet?: string;
  entriesCount?: number;
  eventsCount?: number;
}): InsightArtifact {
  const { events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount } = args;
  
  // Convert events to ReflectionEntry format (only journal events)
  const allReflectionEntries = eventsToReflectionEntries(events);
  
  // Filter entries to window
  const windowEntries = allReflectionEntries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    return createdAt >= windowStart && createdAt <= windowEnd;
  });
  
  // Compute insights using existing pure functions
  const alwaysOnSummary = computeAlwaysOnSummary(windowEntries);
  
  // Convert AlwaysOnSummaryCard[] to InsightCard[] (they're compatible)
  const cards: InsightCard[] = [...alwaysOnSummary];
  
  // Generate artifact ID (deterministic based on window)
  const startDateStr = windowStart.toISOString().split('T')[0];
  const endDateStr = windowEnd.toISOString().split('T')[0];
  const artifactId = `summary-${startDateStr}-${endDateStr}`;
  
  const artifact: InsightArtifact = {
    horizon: 'summary',
    window: {
      kind: 'custom',
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
      timezone,
    },
    createdAt: new Date().toISOString(),
    cards,
  };
  
  return artifact;
}

