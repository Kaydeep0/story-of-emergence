// src/app/lib/insights/distributionLayer.ts
// Distribution Layer: Classifies entry behavior into normal, log normal, power law over time windows
// Pure function - no side effects, no network calls, client-side only

import type { ReflectionEntry } from './types';
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
function computeWindowDistribution(
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
 * Main function: Compute distributions for all time windows
 */
export function computeDistributionLayer(entries: ReflectionEntry[]): WindowDistribution[] {
  const windows: TimeWindowDays[] = [7, 30, 90, 365];
  return windows.map(windowDays => computeWindowDistribution(entries, windowDays));
}

