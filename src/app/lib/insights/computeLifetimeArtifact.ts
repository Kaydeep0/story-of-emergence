// src/app/lib/insights/computeLifetimeArtifact.ts
// Compute Lifetime InsightArtifact using distribution layer (mirrors Distributions pattern)
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeDistributionLayer, computeWindowDistribution, computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from './distributionLayer';

/**
 * Format classification label for display
 */
function formatClassification(classification: string): string {
  if (classification === 'lognormal') return 'Log Normal';
  if (classification === 'powerlaw') return 'Power Law';
  return 'Normal';
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Create lifetime distribution card from distribution results (New Insight Contract)
 */
function createLifetimeDistributionCard(
  distributionResult: DistributionResult,
  windowDistribution: WindowDistribution
): InsightCard & { _distributionResult?: DistributionResult; _windowDistribution?: WindowDistribution } {
  const activeDays = computeActiveDays(distributionResult.dailyCounts);
  const topSpikeDates = getTopSpikeDates(distributionResult, 3);
  const topDay = distributionResult.topDays[0];
  const biggestSpikeDay = topDay ? formatDate(topDay.date) : null;
  const top10PercentShare = distributionResult.stats.top10PercentDaysShare;

  const classification = windowDistribution.classification;
  const classificationLabel = formatClassification(classification);

  // Only generate insight if we can make a falsifiable claim
  // Require at least 30 entries and 10 active days for meaningful pattern detection
  if (distributionResult.totalEntries < 30 || activeDays < 10) {
    // Fallback to simple description if insufficient data
    const title = `Lifetime distribution: ${classificationLabel.toLowerCase()} pattern`;
    const body = `You wrote ${distributionResult.totalEntries} reflections across ${activeDays} active days.`;
    
    return {
      id: `lifetime-distribution-${Date.now()}`,
      kind: 'distribution',
      title,
      explanation: body,
      evidence: topSpikeDates.slice(0, 3).map((date, idx) => {
        const dayData = distributionResult.topDays.find(d => d.date === date);
        return {
          entryId: `spike-${idx}`,
          timestamp: new Date(date).toISOString(),
          preview: `${dayData?.count || 0} entries on ${formatDate(date)}`,
        };
      }),
      computedAt: new Date().toISOString(),
      _distributionResult: distributionResult,
      _windowDistribution: windowDistribution,
    };
  }

  // CLAIM: User's writing pattern is concentrated vs distributed
  const isConcentrated = top10PercentShare > 0.5;
  const claim = isConcentrated
    ? "Your most intense days account for most of your output. You write in concentrated bursts, not steady streams."
    : "Your writing is distributed across time. You maintain a steady cadence rather than concentrated bursts.";

  // EVIDENCE: Concrete metrics
  const evidenceItems: string[] = [
    `${distributionResult.totalEntries} total reflections across ${activeDays} active days`,
    `Top 10% of days account for ${Math.round(top10PercentShare * 100)}% of total output`,
  ];
  
  if (biggestSpikeDay && topDay) {
    evidenceItems.push(`Biggest day: ${biggestSpikeDay} with ${topDay.count} entries`);
  }
  
  // Calculate median entries per active day for contrast
  const medianEntriesPerDay = distributionResult.dailyCounts.length > 0
    ? [...distributionResult.dailyCounts].sort((a, b) => a - b)[Math.floor(distributionResult.dailyCounts.length / 2)]
    : 0;
  
  if (medianEntriesPerDay > 0) {
    evidenceItems.push(`Median entries per active day: ${medianEntriesPerDay}`);
  }

  // CONTRAST: What didn't happen
  const contrast = isConcentrated
    ? "A steady daily cadence pattern was not observed. Most days have zero entries."
    : "A power-law concentration pattern was not observed. Output is more evenly distributed.";

  // CONFIDENCE: Why we're confident
  const confidence = `Pattern observed across ${activeDays} active days with ${distributionResult.totalEntries} total entries. Classification: ${classificationLabel.toLowerCase()} distribution.`;

  const title = claim;
  const explanation = `${claim}\n\nEvidence:\n${evidenceItems.map(e => `• ${e}`).join('\n')}\n\nContrast: ${contrast}\n\nConfidence: ${confidence}`;

  return {
    id: `lifetime-distribution-${Date.now()}`,
    kind: 'distribution', // Must match InsightKind union
    title,
    explanation,
    evidence: topSpikeDates.slice(0, 3).map((date, idx) => {
      const dayData = distributionResult.topDays.find(d => d.date === date);
      return {
        entryId: `spike-${idx}`,
        timestamp: new Date(date).toISOString(),
        preview: `${dayData?.count || 0} entries on ${formatDate(date)}`,
      };
    }),
    computedAt: new Date().toISOString(),
    _distributionResult: distributionResult, // Store original data for reconstruction
    _windowDistribution: windowDistribution, // Store original data for reconstruction
  };
}

/**
 * Compute Lifetime InsightArtifact from events and window
 * 
 * Uses distribution layer (mirrors Distributions pattern):
 * - computeDistributionLayer for lifetime distribution analysis
 * - computeWindowDistribution for classification
 * 
 * Always creates a card when reflections exist, even if event mapping fails.
 * Uses reflections fallback if eventsToReflectionEntries returns empty.
 * 
 * Returns InsightArtifact with distribution card and metadata
 */
export function computeLifetimeArtifact(args: {
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

  // Dev log: Start compute
  if (process.env.NODE_ENV === 'development') {
    console.log('[Lifetime] start compute with reflectionsCount, eventsCount:', {
      reflectionsCount: reflections?.length ?? 0,
      eventsCount: events.length,
    });
  }

  // Convert events to ReflectionEntry format (only journal events)
  let allReflectionEntries = eventsToReflectionEntries(events);

  // Hard fallback: If eventsToReflectionEntries returns empty but we have reflections, build entries directly
  if (allReflectionEntries.length === 0 && reflections && reflections.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[computeLifetimeArtifact] Using reflection fallback: eventsToReflectionEntries returned empty, building from reflections', {
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

  // Filter entries to window (lifetime uses all available data, but we respect the window)
  const windowEntries = allReflectionEntries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    return createdAt >= windowStart && createdAt <= windowEnd;
  });

  // Use fallback: entriesToUse = windowEntries if it has items, else allReflectionEntries
  const entriesToUse = windowEntries.length > 0 ? windowEntries : allReflectionEntries;

  // Dev log: entriesToUse
  if (process.env.NODE_ENV === 'development') {
    const dates = entriesToUse.map(e => new Date(e.createdAt));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
    console.log('[Lifetime] entriesToUse with entriesToUseLength and min and max dates:', {
      entriesToUseLength: entriesToUse.length,
      minDate: minDate?.toISOString() ?? null,
      maxDate: maxDate?.toISOString() ?? null,
    });
  }

  // Compute distribution insights using existing pure functions
  // Use a large window (all available data) for lifetime - use max windowDays (365)
  const distributionResult = computeDistributionLayer(entriesToUse, { windowDays: 365 });
  const windowDistribution = computeWindowDistribution(entriesToUse, 365);

  // Create card (always succeeds if entries exist)
  const cards: InsightCard[] = [];
  
  // Gate on entriesToUse.length > 0 (not events count)
  if (entriesToUse.length > 0) {
    const card = createLifetimeDistributionCard(distributionResult, windowDistribution);
    cards.push(card);

    // Dev log: Card created
    if (process.env.NODE_ENV === 'development') {
      console.log('[Lifetime] artifact created with cardsLength and cardKinds:', {
        cardsLength: cards.length,
        cardKinds: cards.map(c => c.kind),
        totalEntries: distributionResult.totalEntries,
      });
    }
  }

  const artifact: InsightArtifact = {
    horizon: 'lifetime',
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

