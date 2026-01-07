// src/app/lib/insights/computeYearlyArtifact.ts
// Compute Yearly InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeDistributionLayer, computeWindowDistribution, computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from './distributionLayer';
import { validateInsight } from './validateInsight';


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
    kind: 'distribution', // Must match InsightKind union
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
  /** Fallback: reflections to use if eventsToReflectionEntries returns empty */
  reflections?: Array<{ id: string; createdAt: string; plaintext: string }>;
}): InsightArtifact {
  const { events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount, reflections } = args;
  
  // Dev-only logging for Yearly compute path
  if (process.env.NODE_ENV === 'development') {
    const eventDates = events
      .map(e => {
        const isUnified = 'sourceKind' in e;
        let ts: Date | null = null;
        if (isUnified) {
          const unified = e as UnifiedInternalEvent & { occurredAt?: string | Date; createdAt?: string | Date; timestamp?: string | Date };
          ts = unified.occurredAt ? (typeof unified.occurredAt === 'string' ? new Date(unified.occurredAt) : unified.occurredAt) :
               unified.createdAt ? (typeof unified.createdAt === 'string' ? new Date(unified.createdAt) : unified.createdAt) :
               unified.eventAt ? new Date(unified.eventAt) :
               unified.timestamp ? (typeof unified.timestamp === 'string' ? new Date(unified.timestamp) : unified.timestamp) :
               null;
        } else {
          const internal = e as InternalEvent & { occurredAt?: string | Date; timestamp?: string | Date };
          ts = internal.occurredAt ? (typeof internal.occurredAt === 'string' ? new Date(internal.occurredAt) : internal.occurredAt) :
               internal.createdAt ? (internal.createdAt instanceof Date ? internal.createdAt : new Date(internal.createdAt)) :
               internal.eventAt ? (internal.eventAt instanceof Date ? internal.eventAt : new Date(internal.eventAt)) :
               internal.timestamp ? (typeof internal.timestamp === 'string' ? new Date(internal.timestamp) : internal.timestamp) :
               null;
        }
        return ts;
      })
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const minEventIso = eventDates.length > 0 ? eventDates[0].toISOString() : null;
    const maxEventIso = eventDates.length > 0 ? eventDates[eventDates.length - 1].toISOString() : null;
    
    console.log('[computeYearlyArtifact] Yearly compute path debug:', {
      eventCount: events.length,
      windowStartIso: windowStart.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      minEventIso,
      maxEventIso,
      windowStartTime: windowStart.getTime(),
      windowEndTime: windowEnd.getTime(),
      minEventTime: eventDates.length > 0 ? eventDates[0].getTime() : null,
      maxEventTime: eventDates.length > 0 ? eventDates[eventDates.length - 1].getTime() : null,
      eventsInWindow: eventDates.filter(d => d >= windowStart && d <= windowEnd).length,
    });
  }
  
  // Convert events to ReflectionEntry format (only journal events)
  let allReflectionEntries = eventsToReflectionEntries(events);
  
  // Hard fallback: If eventsToReflectionEntries returns empty but we have reflections, build entries directly
  if (allReflectionEntries.length === 0 && reflections && reflections.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[computeYearlyArtifact] Using reflection fallback: eventsToReflectionEntries returned empty, building from reflections', {
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
  
  // NOTE: Do NOT pre-filter entries here. computeDistributionLayer and computeWindowDistribution
  // will filter themselves using their own window calculations. Pre-filtering causes double-filtering
  // which can drop entries if the window calculations don't match exactly.
  
  // Compute distribution insights using existing pure functions
  // These functions will filter entries themselves to the last 365 days
  const distributionResult = computeDistributionLayer(allReflectionEntries, { windowDays: 365 });
  const windowDistribution = computeWindowDistribution(allReflectionEntries, 365);
  
  // Create narrative card from distribution results
  // Note: computeDistributionLayer always returns a DistributionResult (never null), even with 0 entries
  // computeWindowDistribution always returns a WindowDistribution (never null)
  // So distributionResult and windowDistribution are always defined
  const cards: InsightCard[] = [];
  
  // Dev-only logging: verify inputs before card creation
  if (process.env.NODE_ENV === 'development') {
    console.log('[YearlyArtifact] Before card creation:', {
      distributionResultExists: !!distributionResult,
      distributionResultTotalEntries: distributionResult?.totalEntries,
      windowDistributionExists: !!windowDistribution,
      windowDistributionClassification: windowDistribution?.classification,
      willCreateCard: distributionResult.totalEntries > 0,
      // Confirm distributions are always created (same compute path as Distributions page)
      usingSameComputePath: true,
    });
  }
  
  // Robustness rule: If events exist and reflections exist, always create a Yearly card
  // Card creation must key off entries existing (not just distributionResult.totalEntries)
  // This ensures card is created even if event mapping produces zero entries but reflections exist
  const hasEntries = allReflectionEntries.length > 0;
  const hasEvents = (eventsCount ?? events.length) > 0;
  
  // Create card if we have entries OR if we have events (fallback ensures entries exist)
  if (hasEntries && (distributionResult.totalEntries > 0 || hasEvents)) {
    const card = createYearlyNarrativeCard(distributionResult, windowDistribution);
    
    // Insight Contract Gatekeeper: Only render contract-compliant insights
    // Non-compliant insights fail silently (no warnings, no placeholders)
    if (validateInsight(card)) {
      // Dev-only logging: verify card shape after creation
      if (process.env.NODE_ENV === 'development') {
        console.log('[YearlyArtifact] Card created:', {
          cardId: card.id,
          cardKind: card.kind,
          hasDistributionResult: '_distributionResult' in card,
          hasWindowDistribution: '_windowDistribution' in card,
          distributionResultTotalEntries: card._distributionResult?.totalEntries,
          windowDistributionClassification: card._windowDistribution?.classification,
          distributionResultKeys: card._distributionResult ? Object.keys(card._distributionResult) : null,
          windowDistributionKeys: card._windowDistribution ? Object.keys(card._windowDistribution) : null,
        });
      }
      
      cards.push(card);
    }
  } else {
    // Dev-only logging: card not created because totalEntries === 0
    if (process.env.NODE_ENV === 'development') {
      console.log('[YearlyArtifact] Card NOT created - totalEntries is 0:', {
        distributionResultTotalEntries: distributionResult.totalEntries,
        allReflectionEntriesCount: allReflectionEntries.length,
        windowEntriesCount: allReflectionEntries.filter((entry) => {
          const createdAt = new Date(entry.createdAt);
          return createdAt >= windowStart && createdAt <= windowEnd;
        }).length,
      });
    }
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
  
  // Dev-only logging: artifact shape
  if (process.env.NODE_ENV === 'development') {
    console.log('[YearlyArtifact Debug] Keys on the artifact:', Object.keys(artifact));
    
    if (artifact.cards && artifact.cards.length > 0) {
      const firstCard = artifact.cards[0];
      console.log('[YearlyArtifact Debug] Keys on artifact.cards[0]:', Object.keys(firstCard));
      console.log('[YearlyArtifact Debug] Card kind:', firstCard.kind);
      
      // Log metadata keys (fields starting with _)
      const metadataKeys = Object.keys(firstCard).filter(key => key.startsWith('_'));
      console.log('[YearlyArtifact Debug] Keys on artifact.cards[0] metadata (fields starting with _):', metadataKeys);
      
      // Log all card kinds in artifact
      const allKinds = artifact.cards.map(c => c.kind);
      console.log('[YearlyArtifact Debug] All card kinds in artifact:', allKinds);
    } else {
      console.log('[YearlyArtifact Debug] artifact.cards is empty or undefined');
      console.log('[YearlyArtifact Debug] distributionResult.totalEntries:', distributionResult.totalEntries);
    }
  }
  
  return artifact;
}

