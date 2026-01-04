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
  /** Fallback: reflections to use if eventsToReflectionEntries returns empty */
  reflections?: Array<{ id: string; createdAt: string; plaintext: string }>;
}): InsightArtifact {
  const { events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount, reflections } = args;
  
  // Convert events to ReflectionEntry format (only journal events)
  let allReflectionEntries = eventsToReflectionEntries(events);
  
  // Hard fallback: If eventsToReflectionEntries returns empty but we have reflections, build entries directly
  if (allReflectionEntries.length === 0 && reflections && reflections.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[computeDistributionsArtifact] Using reflection fallback: eventsToReflectionEntries returned empty, building from reflections', {
        eventsCount: events.length,
        reflectionsCount: reflections.length,
      });
    }
    
    allReflectionEntries = reflections.map((r) => ({
      id: r.id,
      createdAt: r.createdAt, // keep as ISO
      plaintext: r.plaintext ?? '',
    }));
  }
  
  // Dev log: Timestamp field used for filtering
  if (process.env.NODE_ENV === 'development') {
    console.log('[computeDistributionsArtifact] Timestamp analysis:', {
      eventsCount: events.length,
      allReflectionEntriesCount: allReflectionEntries.length,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      sampleEventEventAt: events.length > 0 ? (events[0] as any).eventAt : null,
      sampleEntryCreatedAt: allReflectionEntries.length > 0 ? allReflectionEntries[0].createdAt : null,
      // Check if timestamps match
      firstEventTimestamp: events.length > 0 ? new Date((events[0] as any).eventAt).toISOString() : null,
      firstEntryTimestamp: allReflectionEntries.length > 0 ? new Date(allReflectionEntries[0].createdAt).toISOString() : null,
    });
  }
  
  // Filter entries to window using the same timestamp source as event generation
  // Events use eventAt (ISO string from r.createdAt), entries use createdAt (ISO string from eventAt)
  const windowEntries = allReflectionEntries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    const isInWindow = createdAt >= windowStart && createdAt <= windowEnd;
    
    // Dev log: Sample filtering
    if (process.env.NODE_ENV === 'development' && allReflectionEntries.indexOf(entry) < 3) {
      console.log('[computeDistributionsArtifact] Filter check:', {
        entryCreatedAt: entry.createdAt,
        createdAtDate: createdAt.toISOString(),
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        isInWindow,
        comparison: {
          start: createdAt >= windowStart,
          end: createdAt <= windowEnd,
        },
      });
    }
    
    return isInWindow;
  });
  
  // Dev log: Filtering results
  if (process.env.NODE_ENV === 'development') {
    console.log('[computeDistributionsArtifact] Filtering results:', {
      allReflectionEntriesCount: allReflectionEntries.length,
      windowEntriesCount: windowEntries.length,
      filteredOut: allReflectionEntries.length - windowEntries.length,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      // Show date range of entries
      minEntryDate: allReflectionEntries.length > 0 
        ? new Date(Math.min(...allReflectionEntries.map(e => new Date(e.createdAt).getTime()))).toISOString()
        : null,
      maxEntryDate: allReflectionEntries.length > 0
        ? new Date(Math.max(...allReflectionEntries.map(e => new Date(e.createdAt).getTime()))).toISOString()
        : null,
    });
  }
  
  // Part A: Fallback entry set - use windowEntries if it has items, else use allReflectionEntries
  // This ensures distributions are computed when events exist but window filtering is too strict
  const entriesToUse = windowEntries.length > 0 
    ? windowEntries 
    : allReflectionEntries;
  
  // Dev log: Entries selection
  if (process.env.NODE_ENV === 'development') {
    if (windowEntries.length === 0 && allReflectionEntries.length > 0) {
      console.warn('[computeDistributionsArtifact] Using fallback: windowEntries empty, using allReflectionEntries', {
        windowEntriesCount: windowEntries.length,
        allReflectionEntriesCount: allReflectionEntries.length,
        entriesToUseCount: entriesToUse.length,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
      });
    }
  }
  
  // Compute distribution insights using existing pure functions
  // Always compute with entriesToUse (which includes fallback)
  const distributionResult = computeDistributionLayer(entriesToUse, { windowDays: 30 });
  const windowDistributions = computeDistributionLayerLegacy(entriesToUse);
  const distributionInsight = computeDistributionInsight(entriesToUse);
  
  // Dev-only sanity check: verify compute completion
  if (process.env.NODE_ENV === 'development') {
    const hasDistributionResult = distributionResult !== null;
    const hasWindowDistributions = windowDistributions.length > 0;
    const hasInsightCard = distributionInsight !== null;
    
    console.log('[Distributions Compute] DistributionResult exists:', hasDistributionResult);
    console.log('[Distributions Compute] WindowDistributions length:', windowDistributions.length);
    console.log('[Distributions Compute] InsightCard exists:', hasInsightCard);
    
    if (hasDistributionResult && hasWindowDistributions && hasInsightCard) {
      console.log('[Distributions Compute] Distributions compute complete');
    } else {
      console.warn('[Distributions Compute] WARNING: Some distributions outputs are missing');
    }
  }
  
  // Create card with metadata
  // Rule: Card creation must key off entriesToUse.length > 0 (not allReflectionEntries.length > 0)
  const cards: InsightCard[] = [];
  
  // Always create card if events exist and we have entries to use
  if ((eventsCount ?? events.length) > 0 && entriesToUse.length > 0) {
    const card = createDistributionsCard(distributionInsight, distributionResult, windowDistributions);
    cards.push(card);
    
    // Dev log: Card created
    if (process.env.NODE_ENV === 'development') {
      console.log('[computeDistributionsArtifact] Card created:', {
        cardId: card.id,
        cardKind: card.kind,
        usedFallback: windowEntries.length === 0 && allReflectionEntries.length > 0,
        eventsCount: eventsCount ?? events.length,
        entriesUsedCount: entriesToUse.length,
        windowEntriesCount: windowEntries.length,
        allReflectionEntriesCount: allReflectionEntries.length,
        hasDistributionResult: '_distributionResult' in card,
        hasWindowDistributions: '_windowDistributions' in card,
        hasDistributionInsight: '_distributionInsight' in card,
        distributionResultTotalEntries: card._distributionResult?.totalEntries,
        windowDistributionsLength: card._windowDistributions?.length ?? 0,
        distributionInsightTitle: card._distributionInsight?.title,
      });
    }
  } else {
    // Dev log: No card created - no events or no entries
    if (process.env.NODE_ENV === 'development') {
      console.warn('[computeDistributionsArtifact] No card created - conditions not met:', {
        eventsCount: eventsCount ?? events.length,
        allReflectionEntriesCount: allReflectionEntries.length,
        windowEntriesCount: windowEntries.length,
        entriesToUseCount: entriesToUse.length,
        hasReflectionsFallback: reflections && reflections.length > 0,
        reflectionsCount: reflections?.length ?? 0,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
      });
    }
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
  
  // Dev log: Artifact ready
  if (process.env.NODE_ENV === 'development') {
    console.log('[computeDistributionsArtifact] Artifact ready:', {
      horizon: artifact.horizon,
      cardsLength: artifact.cards.length,
      cardKinds: artifact.cards.map(c => c.kind),
    });
  }
  
  return artifact;
}

