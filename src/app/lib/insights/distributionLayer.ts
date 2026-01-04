// src/app/lib/insights/distributionLayer.ts
// Distribution Layer: Classifies entry behavior into normal, log normal, power law over time windows
// Pure function - no side effects, no network calls, client-side only

import type { ReflectionEntry, InsightCard } from './types';
import { filterEventsByWindow, groupByDay } from './timeWindows';

export type TimeWindowDays = 7 | 30 | 90 | 365;

export type WindowDistribution = {
  windowDays: TimeWindowDays;
  classification: 'normal' | 'lognormal' | 'powerlaw';
  frequencyPerDay: number;
  magnitudeProxy: number; // average word count
  recencyGaps: number[]; // time between entries in days
  topSpikeDates: string[]; // top 3 spike dates (YYYY-MM-DD)
  explanation: string;
};

/**
 * Get date key in YYYY-MM-DD format
 */
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get word count from plaintext
 */
function getWordCount(plaintext: string): number {
  if (!plaintext || typeof plaintext !== 'string') return 0;
  return plaintext.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Compute frequency per day (entries per day)
 */
function computeFrequencyPerDay(entries: ReflectionEntry[], windowDays: number): number {
  if (entries.length === 0) return 0;
  return entries.length / windowDays;
}

/**
 * Compute magnitude proxy (average word count)
 */
function computeMagnitudeProxy(entries: ReflectionEntry[]): number {
  if (entries.length === 0) return 0;
  const totalWords = entries.reduce((sum, entry) => sum + getWordCount(entry.plaintext), 0);
  return totalWords / entries.length;
}

/**
 * Compute recency gaps (time between entries in days)
 */
function computeRecencyGaps(entries: ReflectionEntry[]): number[] {
  if (entries.length < 2) return [];
  
  const sorted = [...entries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].createdAt);
    const curr = new Date(sorted[i].createdAt);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    gaps.push(diffDays);
  }
  
  return gaps;
}

/**
 * Find top spike dates (days with most entries)
 */
function findTopSpikeDates(entries: ReflectionEntry[], count: number = 3): string[] {
  if (entries.length === 0) return [];
  
  const byDay = groupByDay(entries);
  const dayCounts: Array<{ date: string; count: number }> = [];
  
  for (const [date, dayEntries] of byDay.entries()) {
    dayCounts.push({ date, count: dayEntries.length });
  }
  
  // Sort by count descending, then by date descending
  dayCounts.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.date.localeCompare(a.date);
  });
  
  return dayCounts.slice(0, count).map(d => d.date);
}

/**
 * Classify distribution based on metrics
 */
function classifyDistribution(
  entries: ReflectionEntry[],
  frequencyPerDay: number,
  magnitudeProxy: number,
  recencyGaps: number[]
): 'normal' | 'lognormal' | 'powerlaw' {
  if (entries.length === 0) return 'normal';
  
  // Compute daily counts for skew/concentration analysis
  const byDay = groupByDay(entries);
  const dailyCounts = Array.from(byDay.values()).map(arr => arr.length);
  
  if (dailyCounts.length === 0) return 'normal';
  
  // Compute skew
  const n = dailyCounts.length;
  const mean = dailyCounts.reduce((s, c) => s + c, 0) / n;
  const variance = dailyCounts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / (n || 1);
  const std = Math.sqrt(variance || 0);
  const skew = std === 0 ? 0 : 
    (dailyCounts.reduce((s, c) => s + Math.pow(c - mean, 3), 0) / n) / Math.pow(std, 3);
  
  // Compute concentration (top 10% of days)
  const total = dailyCounts.reduce((s, c) => s + c, 0);
  const sorted = [...dailyCounts].sort((a, b) => b - a);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1));
  const topSum = sorted.slice(0, topCount).reduce((s, c) => s + c, 0);
  const concentration = total === 0 ? 0 : topSum / total;
  
  // Compute variance in recency gaps
  const gapVariance = recencyGaps.length > 0 ? 
    (() => {
      const gapMean = recencyGaps.reduce((s, g) => s + g, 0) / recencyGaps.length;
      return recencyGaps.reduce((s, g) => s + Math.pow(g - gapMean, 2), 0) / recencyGaps.length;
    })() : 0;
  
  // Classification heuristics:
  // Power law: very high concentration (≥60%) OR extreme skew (≥2) OR huge variance in gaps
  if (concentration >= 0.6 || skew >= 2 || (gapVariance > 100 && recencyGaps.length > 0)) {
    return 'powerlaw';
  }
  
  // Log normal: noticeable right skew (≥0.8) OR moderate concentration (≥40%) OR moderate gap variance
  if (skew >= 0.8 || concentration >= 0.4 || (gapVariance > 10 && recencyGaps.length > 0)) {
    return 'lognormal';
  }
  
  // Normal: low skew (≤0.4) AND low concentration (≤30%) AND low gap variance
  if (Math.abs(skew) <= 0.4 && concentration <= 0.3 && gapVariance <= 10) {
    return 'normal';
  }
  
  // Default to lognormal for edge cases
  return 'lognormal';
}

/**
 * Generate explanation string for classification
 */
function generateExplanation(
  classification: 'normal' | 'lognormal' | 'powerlaw',
  frequencyPerDay: number,
  magnitudeProxy: number,
  topSpikeDates: string[]
): string {
  const freqDesc = frequencyPerDay < 0.5 ? 'sparse' : frequencyPerDay < 1 ? 'moderate' : 'frequent';
  const magDesc = magnitudeProxy < 50 ? 'brief' : magnitudeProxy < 200 ? 'moderate' : 'detailed';
  
  if (classification === 'normal') {
    return `Steady ${freqDesc} entries with consistent ${magDesc} writing. Regular pattern with low variance.`;
  } else if (classification === 'lognormal') {
    return `Mostly small entries with occasional medium spikes. ${magDesc} writing with moderate variance.`;
  } else {
    return `Long quiet periods followed by rare huge spikes. ${magDesc} writing with high variance.`;
  }
}

/**
 * Compute distribution for a specific time window
 */
export function computeWindowDistribution(
  entries: ReflectionEntry[],
  windowDays: TimeWindowDays
): WindowDistribution {
  const now = new Date();
  const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const end = now;
  
  const windowEntries = filterEventsByWindow(entries, start, end);
  
  const frequencyPerDay = computeFrequencyPerDay(windowEntries, windowDays);
  const magnitudeProxy = computeMagnitudeProxy(windowEntries);
  const recencyGaps = computeRecencyGaps(windowEntries);
  const topSpikeDates = findTopSpikeDates(windowEntries, 3);
  const classification = classifyDistribution(windowEntries, frequencyPerDay, magnitudeProxy, recencyGaps);
  const explanation = generateExplanation(classification, frequencyPerDay, magnitudeProxy, topSpikeDates);
  
  return {
    windowDays,
    classification,
    frequencyPerDay,
    magnitudeProxy,
    recencyGaps,
    topSpikeDates,
    explanation,
  };
}

/**
 * Distribution computation result with detailed stats
 */
export type DistributionResult = {
  totalEntries: number;
  dateRange: { start: Date; end: Date };
  dailyCounts: number[];
  topDays: Array<{ date: string; count: number }>;
  fittedBuckets: {
    normal: { count: number; share: number };
    lognormal: { count: number; share: number };
    powerlaw: { count: number; share: number };
  };
  stats: {
    mostCommonDayCount: number;
    variance: number;
    spikeRatio: number; // max day / median day
    top10PercentDaysShare: number; // power law signal
  };
};

/**
 * Compute distribution layer with detailed stats
 */
export function computeDistributionLayer(
  entries: ReflectionEntry[],
  opts?: { windowDays?: TimeWindowDays }
): DistributionResult {
  const windowDays = opts?.windowDays || 30;
  const now = new Date();
  const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const end = now;
  
  const windowEntries = filterEventsByWindow(entries, start, end);
  
  if (windowEntries.length === 0) {
    return {
      totalEntries: 0,
      dateRange: { start, end },
      dailyCounts: [],
      topDays: [],
      fittedBuckets: {
        normal: { count: 0, share: 0 },
        lognormal: { count: 0, share: 0 },
        powerlaw: { count: 0, share: 0 },
      },
      stats: {
        mostCommonDayCount: 0,
        variance: 0,
        spikeRatio: 0,
        top10PercentDaysShare: 0,
      },
    };
  }
  
  // Group by day and get counts
  const byDay = groupByDay(windowEntries);
  const dayCounts: Array<{ date: string; count: number }> = [];
  
  for (const [date, dayEntries] of byDay.entries()) {
    dayCounts.push({ date, count: dayEntries.length });
  }
  
  // Sort by count descending, then date descending (most recent wins ties)
  // This ensures deterministic tie-breaking: Dec 28 beats Dec 27 when both have 24 entries
  const sortedByCount = [...dayCounts].sort((a, b) => {
    const countDiff = b.count - a.count;
    if (countDiff !== 0) {
      return countDiff; // Count descending
    }
    // Tie-break: date descending (most recent wins)
    return b.date.localeCompare(a.date);
  });
  const topDays = sortedByCount.slice(0, 10);
  
  // Get daily counts array (for variance calculation)
  const dailyCountsArray = dayCounts.map(d => d.count);
  
  // Compute stats
  const counts = dailyCountsArray;
  const n = counts.length;
  
  if (n === 0) {
    return {
      totalEntries: windowEntries.length,
      dateRange: { start, end },
      dailyCounts: [],
      topDays: [],
      fittedBuckets: {
        normal: { count: 0, share: 0 },
        lognormal: { count: 0, share: 0 },
        powerlaw: { count: 0, share: 0 },
      },
      stats: {
        mostCommonDayCount: 0,
        variance: 0,
        spikeRatio: 0,
        top10PercentDaysShare: 0,
      },
    };
  }
  
  // Most common day count (mode)
  const countFreq = new Map<number, number>();
  counts.forEach(c => countFreq.set(c, (countFreq.get(c) || 0) + 1));
  let mostCommonDayCount = 0;
  let maxFreq = 0;
  countFreq.forEach((freq, count) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      mostCommonDayCount = count;
    }
  });
  
  // Variance
  const mean = counts.reduce((s, c) => s + c, 0) / n;
  const variance = counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / n;
  
  // Spike ratio (max day / median of non-zero days)
  const nonZeroCounts = counts.filter(c => c > 0);
  const sortedNonZero = [...nonZeroCounts].sort((a, b) => a - b);
  const median = sortedNonZero.length > 0
    ? sortedNonZero.length % 2 === 0
      ? (sortedNonZero[sortedNonZero.length / 2 - 1] + sortedNonZero[sortedNonZero.length / 2]) / 2
      : sortedNonZero[Math.floor(sortedNonZero.length / 2)]
    : 0;
  const maxCount = Math.max(...counts, 0);
  const spikeRatio = median > 0 ? maxCount / median : (maxCount > 0 ? maxCount : 0);
  
  // Top 10 percent days share (power law signal)
  const total = counts.reduce((s, c) => s + c, 0);
  const top10PercentCount = Math.max(1, Math.ceil(n * 0.1));
  const top10PercentDays = sortedByCount.slice(0, top10PercentCount);
  const top10PercentTotal = top10PercentDays.reduce((s, d) => s + d.count, 0);
  const top10PercentDaysShare = total > 0 ? top10PercentTotal / total : 0;
  
  // Classify into buckets
  const dist = computeWindowDistribution(entries, windowDays);
  const normalCount = dist.classification === 'normal' ? 1 : 0;
  const lognormalCount = dist.classification === 'lognormal' ? 1 : 0;
  const powerlawCount = dist.classification === 'powerlaw' ? 1 : 0;
  
  return {
    totalEntries: windowEntries.length,
    dateRange: { start, end },
    dailyCounts: dailyCountsArray,
    topDays,
    fittedBuckets: {
      normal: { count: normalCount, share: normalCount },
      lognormal: { count: lognormalCount, share: lognormalCount },
      powerlaw: { count: powerlawCount, share: powerlawCount },
    },
    stats: {
      mostCommonDayCount,
      variance,
      spikeRatio,
      top10PercentDaysShare,
    },
  };
}

/**
 * Legacy function: Compute distributions for all time windows (for backward compatibility)
 */
export function computeDistributionLayerLegacy(entries: ReflectionEntry[]): WindowDistribution[] {
  const windows: TimeWindowDays[] = [7, 30, 90, 365];
  return windows.map(windowDays => computeWindowDistribution(entries, windowDays));
}

/**
 * Compute active days count (days with at least 1 entry)
 */
export function computeActiveDays(dailyCounts: number[]): number {
  return dailyCounts.filter(count => count > 0).length;
}

/**
 * Get top spike dates from distribution result
 */
export function getTopSpikeDates(distributionResult: DistributionResult, count: number = 3): string[] {
  return distributionResult.topDays.slice(0, count).map(d => d.date);
}

/**
 * Compute a distribution insight card for the 30-day window
 * Returns null if there's not enough data
 */
export function computeDistributionInsight(entries: ReflectionEntry[]): InsightCard | null {
  const dist30 = computeWindowDistribution(entries, 30);
  
  // Need at least some entries to create an insight
  if (entries.length === 0 || dist30.topSpikeDates.length === 0) {
    return null;
  }
  
  // Get entries in the 30-day window
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = now;
  const windowEntries = filterEventsByWindow(entries, start, end);
  
  // Group by day and get counts
  const byDay = groupByDay(windowEntries);
  const dayCounts: Array<{ date: string; count: number }> = [];
  
  for (const [date, dayEntries] of byDay.entries()) {
    dayCounts.push({ date, count: dayEntries.length });
  }
  
  // Sort by count descending
  dayCounts.sort((a, b) => b.count - a.count);
  
  // Get top 3 days
  const top3 = dayCounts.slice(0, 3);
  const top3Total = top3.reduce((sum, d) => sum + d.count, 0);
  const totalEntries = windowEntries.length;
  const top3Percent = totalEntries > 0 ? Math.round((top3Total / totalEntries) * 100) : 0;
  
  // Only create insight if it's power law or log normal (not normal)
  if (dist30.classification === 'normal') {
    return null;
  }
  
  // Determine title based on classification
  const title = dist30.classification === 'powerlaw' 
    ? 'Your activity follows a power law'
    : 'Your activity follows a log-normal pattern';
  
  // Create explanation
  const explanation = `Over the last 30 days, a small number of days account for most of your writing and thinking. Three spikes explain ~${top3Percent}% of total output.`;
  
  // Create evidence from top 3 spike dates
  const evidence = top3.flatMap((day, idx) => {
    const dayEntries = byDay.get(day.date) || [];
    // Return up to 3 entries per spike day as evidence
    return dayEntries.slice(0, 3).map((entry) => ({
      entryId: entry.id,
      timestamp: entry.createdAt,
      preview: entry.plaintext.substring(0, 50) || `${day.count} entries`,
    }));
  }).slice(0, 10); // Limit total evidence to 10 entries
  
  return {
    id: `distribution-30d-${Date.now()}`,
    kind: 'distribution',
    title,
    explanation,
    evidence,
    computedAt: new Date().toISOString(),
  };
}

