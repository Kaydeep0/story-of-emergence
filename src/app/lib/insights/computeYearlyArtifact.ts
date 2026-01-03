// src/app/lib/insights/computeYearlyArtifact.ts
// Compute Yearly InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { computeDistributionLayer, computeWindowDistribution, computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from './distributionLayer';

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
        id: `yearly-entry-${entries.length}`,
        createdAt: eventAt.toISOString(),
        plaintext,
      });
    }
  }
  
  return entries;
}

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
 * Create narrative InsightCard from distribution results
 */
function createYearlyNarrativeCard(
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

  // Build narrative
  const title = `Your year followed a ${classificationLabel.toLowerCase()} pattern`;
  
  let body = `You wrote ${distributionResult.totalEntries} reflections across ${activeDays} active days. `;
  
  if (top10PercentShare > 0.5) {
    body += `Your most intense days account for ${Math.round(top10PercentShare * 100)}% of your total output. `;
  } else {
    body += `Your writing was spread across ${activeDays} days. `;
  }
  
  if (biggestSpikeDay) {
    body += `Your biggest day was ${biggestSpikeDay} with ${topDay.count} entries.`;
  }

  return {
    id: `yearly-wrap-${Date.now()}`,
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
    _distributionResult: distributionResult, // Store original data for reconstruction
    _windowDistribution: windowDistribution, // Store original data for reconstruction
  };
}

/**
 * Compute Yearly InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - computeDistributionLayer for 365-day distribution analysis
 * - computeWindowDistribution for classification
 * 
 * Returns InsightArtifact with narrative card and metadata
 */
export function computeYearlyArtifact(args: {
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
  
  // Filter entries to window (365-day window for yearly)
  const windowEntries = allReflectionEntries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    return createdAt >= windowStart && createdAt <= windowEnd;
  });
  
  // Compute distribution insights using existing pure functions
  const distributionResult = computeDistributionLayer(windowEntries, { windowDays: 365 });
  const windowDistribution = computeWindowDistribution(windowEntries, 365);
  
  // Create narrative card from distribution results
  const cards: InsightCard[] = [];
  
  // Only create card if we have data
  if (distributionResult.totalEntries > 0) {
    cards.push(createYearlyNarrativeCard(distributionResult, windowDistribution));
  }
  
  const artifact: InsightArtifact = {
    horizon: 'yearly',
    window: {
      kind: 'year',
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
      timezone,
    },
    createdAt: new Date().toISOString(),
    cards,
  };
  
  return artifact;
}

