// src/app/lib/insights/computeYearOverYearArtifact.ts
// Compute Year-over-Year InsightArtifact with resilience for empty years
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard, YearOverYearCard, YearOverYearData } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeDistributionLayer, computeActiveDays } from './distributionLayer';

/**
 * Compute metrics for a single year
 */
function computeYearMetrics(entries: ReflectionEntry[]): {
  totalEntries: number;
  activeDays: number;
  topDayCount: number;
  spikeRatio: number;
  top10Share: number;
} {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      activeDays: 0,
      topDayCount: 0,
      spikeRatio: 0,
      top10Share: 0,
    };
  }

  // Use distribution layer to compute metrics
  const distributionResult = computeDistributionLayer(entries, { windowDays: 365 });
  const activeDays = computeActiveDays(distributionResult.dailyCounts);
  const topDay = distributionResult.topDays[0];
  const topDayCount = topDay?.count ?? 0;
  const spikeRatio = distributionResult.stats.spikeRatio;
  const top10Share = distributionResult.stats.top10PercentDaysShare;

  return {
    totalEntries: entries.length,
    activeDays,
    topDayCount,
    spikeRatio,
    top10Share,
  };
}

/**
 * Create a YoY card that handles empty years gracefully
 */
function createYoYCard(
  yearA: number,
  yearB: number,
  yearAEntries: ReflectionEntry[],
  yearBEntries: ReflectionEntry[],
  yearAMetrics: ReturnType<typeof computeYearMetrics>,
  yearBMetrics: ReturnType<typeof computeYearMetrics>
): InsightCard & { _yoyCard?: YearOverYearCard; _fromYear?: number; _toYear?: number } {
  const aCount = yearAMetrics.totalEntries;
  const bCount = yearBMetrics.totalEntries;

  // Compute deltas
  const deltaTotalEntries = bCount - aCount;
  const deltaActiveDays = yearBMetrics.activeDays - yearAMetrics.activeDays;
  const deltaSpikeRatio = yearBMetrics.spikeRatio - yearAMetrics.spikeRatio;

  // Build narrative
  let title: string;
  let explanation: string;

  if (aCount === 0 && bCount === 0) {
    title = `${yearB} vs ${yearA}: No data for either year`;
    explanation = `Neither ${yearA} nor ${yearB} have reflection entries.`;
  } else if (aCount === 0) {
    title = `${yearB} vs ${yearA}: ${yearB} had ${bCount} entries`;
    explanation = `${yearB} had ${bCount} entries across ${yearBMetrics.activeDays} active days. No data available for ${yearA}.`;
  } else if (bCount === 0) {
    title = `${yearB} vs ${yearA}: ${yearA} had ${aCount} entries`;
    explanation = `${yearA} had ${aCount} entries across ${yearAMetrics.activeDays} active days. No data available for ${yearB}.`;
  } else {
    // Both years have data - compute comparison
    const percentChange = aCount > 0 ? Math.round((deltaTotalEntries / aCount) * 100) : 0;
    const direction = deltaTotalEntries === 0 ? 'unchanged' : deltaTotalEntries > 0 ? 'increased' : 'decreased';
    
    title = `${yearB} vs ${yearA}: ${direction} by ${Math.abs(deltaTotalEntries)} entries`;
    explanation = `${yearB} had ${bCount} entries (${yearBMetrics.activeDays} active days) compared to ${yearA}'s ${aCount} entries (${yearAMetrics.activeDays} active days).`;
    if (percentChange !== 0) {
      explanation += ` That's a ${Math.abs(percentChange)}% ${direction === 'increased' ? 'increase' : 'decrease'}.`;
    }
  }

  // Build evidence from sample entries
  const evidence = [
    ...yearAEntries.slice(0, 3).map((r) => ({
      entryId: r.id,
      timestamp: r.createdAt,
      preview: r.plaintext?.substring(0, 50) || '',
    })),
    ...yearBEntries.slice(0, 3).map((r) => ({
      entryId: r.id,
      timestamp: r.createdAt,
      preview: r.plaintext?.substring(0, 50) || '',
    })),
  ];

  const yoyData: YearOverYearData = {
    fromYear: yearA,
    toYear: yearB,
    themeContinuities: [],
    themeDisappearances: [],
    themeEmergences: [],
    languageShifts: [],
    notableAbsences: [],
  };

  const yoyCard: YearOverYearCard = {
    id: `yoy:${yearA}:${yearB}`,
    kind: 'year_over_year',
    title,
    explanation,
    evidence,
    computedAt: new Date().toISOString(),
    data: yoyData,
    derived: true,
  };

  return {
    ...yoyCard,
    _yoyCard: yoyCard,
    _fromYear: yearA,
    _toYear: yearB,
  };
}

/**
 * Compute Year-over-Year InsightArtifact from events and window
 * 
 * Always creates a card when reflections exist, even if one year is empty.
 * Uses reflections fallback if eventsToReflectionEntries returns empty.
 * 
 * Returns InsightArtifact with YoY card
 */
export function computeYearOverYearArtifact(args: {
  events: (InternalEvent | UnifiedInternalEvent)[];
  windowStart: Date;
  windowEnd: Date;
  timezone?: string;
  wallet?: string;
  entriesCount?: number;
  eventsCount?: number;
  fromYear?: number;
  toYear?: number;
  /** Fallback: reflections to use if eventsToReflectionEntries returns empty */
  reflections?: Array<{ id: string; createdAt: string; plaintext: string }>;
}): InsightArtifact {
  const { events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount, fromYear, toYear, reflections } = args;

  // Dev log: Start compute
  if (process.env.NODE_ENV === 'development') {
    console.log('[YoY] start compute with yearA, yearB, reflectionsCount, eventsCount:', {
      yearA: fromYear,
      yearB: toYear,
      reflectionsCount: reflections?.length ?? 0,
      eventsCount: events.length,
    });
  }

  // Convert events to ReflectionEntry format (only journal events)
  let allReflectionEntries = eventsToReflectionEntries(events);

  // Hard fallback: If eventsToReflectionEntries returns empty but we have reflections, build entries directly
  if (allReflectionEntries.length === 0 && reflections && reflections.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[computeYearOverYearArtifact] Using reflection fallback: eventsToReflectionEntries returned empty, building from reflections', {
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

  // Filter entries to window
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
    console.log('[YoY] entriesToUse with entriesToUseLength and min and max dates:', {
      entriesToUseLength: entriesToUse.length,
      minDate: minDate?.toISOString() ?? null,
      maxDate: maxDate?.toISOString() ?? null,
    });
  }

  // Determine years to compare
  let yearA: number | null = null;
  let yearB: number | null = null;

  if (fromYear !== undefined && toYear !== undefined) {
    yearA = fromYear;
    yearB = toYear;
  } else {
    // Group by year to find available years
    const groupedByYear = new Map<number, ReflectionEntry[]>();
    for (const entry of entriesToUse) {
      const year = new Date(entry.createdAt).getFullYear();
      if (!groupedByYear.has(year)) {
        groupedByYear.set(year, []);
      }
      groupedByYear.get(year)!.push(entry);
    }
    const availableYears = Array.from(groupedByYear.keys()).sort((a, b) => b - a);
    
    if (availableYears.length >= 2) {
      yearA = availableYears[1]; // Older year
      yearB = availableYears[0]; // Newer year
    } else if (availableYears.length === 1) {
      yearA = availableYears[0];
      yearB = availableYears[0]; // Compare year to itself (will show no change)
    }
  }

  const cards: InsightCard[] = [];

  // Always create a card if we have entries and years are specified
  // Gate on entriesToUse.length > 0 (not events count)
  if (entriesToUse.length > 0 && yearA !== null && yearB !== null) {
    // Filter entries for each year
    const yearAEntries = entriesToUse.filter((r) => {
      const year = new Date(r.createdAt).getFullYear();
      return year === yearA;
    });
    const yearBEntries = entriesToUse.filter((r) => {
      const year = new Date(r.createdAt).getFullYear();
      return year === yearB;
    });

    // Compute metrics for each year (handles empty years gracefully)
    const yearAMetrics = computeYearMetrics(yearAEntries);
    const yearBMetrics = computeYearMetrics(yearBEntries);

    // Create card (always succeeds, even if one year is empty)
    const card = createYoYCard(yearA, yearB, yearAEntries, yearBEntries, yearAMetrics, yearBMetrics);
    cards.push(card);

    // Dev log: Card created
    if (process.env.NODE_ENV === 'development') {
      console.log('[YoY] artifact created with cardsLength and cardKinds:', {
        cardsLength: cards.length,
        cardKinds: cards.map(c => c.kind),
        yearAEntriesCount: yearAEntries.length,
        yearBEntriesCount: yearBEntries.length,
      });
    }
  }

  const artifact: InsightArtifact = {
    horizon: 'yoy',
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

