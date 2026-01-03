// src/app/lib/insights/computeDistributionsArtifact.ts
// Compute Distributions InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { computeDistributionLayer, computeDistributionLayerLegacy, computeDistributionInsight, type DistributionResult, type WindowDistribution } from './distributionLayer';

/**
 * Convert InternalEvent or UnifiedInternalEvent to ReflectionEntry format
 * Only includes journal events (sourceKind === "journal" && eventKind === "written")
 */
function eventsToReflectionEntries(
  events: (InternalEvent | UnifiedInternalEvent)[]
): ReflectionEntry[] {
  const entries: ReflectionEntry[] = [];
  
  for (const ev of events) {
    const eventAt = typeof ev.eventAt === 'string' ? new Date(ev.eventAt) : ev.eventAt;
    
    // Determine if this is a UnifiedInternalEvent or legacy InternalEvent
    const isUnified = 'sourceKind' in ev;
    
    let sourceKind: string | undefined;
    let eventKind: string | undefined;
    let plaintext: string | undefined;
    
    if (isUnified) {
      const unified = ev as UnifiedInternalEvent;
      sourceKind = unified.sourceKind;
      eventKind = unified.eventKind;
      plaintext = unified.details;
    } else {
      const internal = ev as InternalEvent;
      const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
      sourceKind = payload.source_kind as string | undefined;
      eventKind = payload.event_kind as string | undefined;
      
      if (typeof payload?.content === 'string') {
        plaintext = payload.content;
      } else if (typeof payload?.raw_metadata === 'object' && payload.raw_metadata !== null) {
        const rawMeta = payload.raw_metadata as Record<string, unknown>;
        if (typeof rawMeta.content === 'string') {
          plaintext = rawMeta.content;
        }
      }
    }
    
    // Only include journal events
    if (sourceKind === 'journal' && eventKind === 'written' && plaintext) {
      entries.push({
        id: `distributions-entry-${entries.length}`,
        createdAt: eventAt.toISOString(),
        plaintext,
      });
    }
  }
  
  return entries;
}

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

