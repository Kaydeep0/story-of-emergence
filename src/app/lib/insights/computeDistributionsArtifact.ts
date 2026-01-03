// src/app/lib/insights/computeDistributionsArtifact.ts
// Compute Distributions InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeDistributionLayer, computeDistributionLayerLegacy, computeDistributionInsight, type DistributionResult, type WindowDistribution } from './distributionLayer';


/**
 * Create distributions card from insight
 */
function createDistributionsCard(
  distributionInsight: InsightCard | null,
  distributionResult: DistributionResult | null,
  windowDistributions: WindowDistribution[]
): InsightCard & { 
  _distributionResult?: DistributionResult;
  _windowDistributions?: WindowDistribution[];
  _distributionInsight?: InsightCard | null;
} {
  // Use the insight card if available, otherwise create a placeholder
  const baseCard: InsightCard = distributionInsight || {
    id: `distributions-${Date.now()}`,
    kind: 'distribution',
    title: 'Distribution Analysis',
    explanation: 'Pattern analysis across time windows',
    evidence: [],
    computedAt: new Date().toISOString(),
  };
  
  return {
    ...baseCard,
    _distributionResult: distributionResult ?? undefined,
    _windowDistributions: windowDistributions,
    _distributionInsight: distributionInsight ?? undefined,
  };
}

/**
 * Compute Distributions InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - computeDistributionLayer for 30-day detailed distribution
 * - computeDistributionLayerLegacy for multi-window distributions
 * - computeDistributionInsight for insight card
 * 
 * Returns InsightArtifact with distribution card and metadata
 */
export function computeDistributionsArtifact(args: {
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
  
  // Compute distribution insights using existing pure functions
  const distributionResult = computeDistributionLayer(windowEntries, { windowDays: 30 });
  const windowDistributions = computeDistributionLayerLegacy(windowEntries);
  const distributionInsight = computeDistributionInsight(windowEntries);
  
  // Create card with metadata
  const cards: InsightCard[] = [];
  if (windowEntries.length > 0) {
    cards.push(createDistributionsCard(distributionInsight, distributionResult, windowDistributions));
  }
  
  const artifact: InsightArtifact = {
    horizon: 'distributions',
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

