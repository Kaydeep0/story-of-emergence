// src/app/lib/insights/timelineSpikes.ts
// Pure function to compute timeline spikes from decrypted reflections
// Runs entirely client-side - no network calls, no side effects
//
// DATA FLOW: Source → Reflection → Internal Event → Insight
//
// This module is part of the INSIGHT generation phase:
//
// 1. SOURCE: External entries (YouTube, articles, books) stored in external_entries
// 2. REFLECTION: User imports source → creates reflection entry → linked via reflection_links
// 3. INTERNAL EVENT: Reflection creation logs internal_event (source_event type)
// 4. INSIGHT: This function analyzes reflections (including source-linked ones) to detect:
//    - Days with unusually high writing activity (spikes)
//    - Spikes are days with ≥3 entries AND ≥2× median daily activity
//
// Input: Array of ReflectionEntry (already decrypted, may have sourceId)
// Output: Array of TimelineSpikeCard (insight cards for detected spikes)
//
// Source-linked reflections are identified by sourceId field on ReflectionEntry.
// The Insights page uses this to show "From source" badges on spikes.

import type { ReflectionEntry, InsightCard, InsightEvidence, TimelineSpikeCard, TimelineSpikeData } from './types';

/**
 * Configuration for spike detection
 */
const SPIKE_CONFIG = {
  // Minimum multiplier above median to be considered a spike
  minMultiplier: 2,
  // Minimum absolute count to be considered a spike
  minCount: 3,
  // Minimum days of data needed to compute meaningful median
  minDaysForAnalysis: 3,
};

/**
 * Get the calendar date key (YYYY-MM-DD) for a given date in local timezone
 */
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date for display (e.g., "November 30")
 */
function formatDateForDisplay(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/**
 * Calculate the median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Group entries by calendar day (local timezone)
 * Returns a Map of dateKey -> entries for that day
 */
function groupEntriesByDay(entries: ReflectionEntry[]): Map<string, ReflectionEntry[]> {
  const grouped = new Map<string, ReflectionEntry[]>();
  
  for (const entry of entries) {
    // Skip deleted entries
    if (entry.deletedAt) continue;
    
    const date = new Date(entry.createdAt);
    const dateKey = getDateKey(date);
    
    const existing = grouped.get(dateKey) || [];
    existing.push(entry);
    grouped.set(dateKey, existing);
  }
  
  return grouped;
}

/**
 * Generate a unique ID for an insight
 */
function generateInsightId(kind: string, dateKey: string): string {
  return `${kind}-${dateKey}-${Date.now()}`;
}

/**
 * Create a short preview of entry content (first ~50 chars)
 */
function createPreview(plaintext: string, maxLength = 50): string {
  const cleaned = plaintext.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '…';
}

/**
 * Compute timeline spikes from decrypted entries
 * 
 * This is a PURE FUNCTION - it has no side effects and makes no network calls.
 * All data must already be decrypted and in memory.
 * 
 * Algorithm:
 * 1. Group entries by calendar day (local timezone)
 * 2. Count entries per day
 * 3. Calculate median daily count as baseline
 * 4. Identify days where count >= 2x median AND count >= 3
 * 5. Generate InsightCard for each spike day
 * 
 * @param entries - Array of decrypted reflection entries
 * @returns Array of InsightCards representing detected spikes
 */
export function computeTimelineSpikes(entries: ReflectionEntry[]): TimelineSpikeCard[] {
  // Filter out deleted entries and ensure we have data
  const activeEntries = entries.filter(e => !e.deletedAt);
  
  if (activeEntries.length === 0) {
    return [];
  }
  
  // Group by day
  const entriesByDay = groupEntriesByDay(activeEntries);
  
  // Need enough days to compute meaningful baseline
  if (entriesByDay.size < SPIKE_CONFIG.minDaysForAnalysis) {
    return [];
  }
  
  // Get counts per day
  const dayCounts: Array<{ dateKey: string; count: number; entries: ReflectionEntry[] }> = [];
  
  for (const [dateKey, dayEntries] of entriesByDay) {
    dayCounts.push({
      dateKey,
      count: dayEntries.length,
      entries: dayEntries,
    });
  }
  
  // Calculate median
  const countsOnly = dayCounts.map(d => d.count);
  const medianCount = median(countsOnly);
  
  // If median is 0, use 1 to avoid division issues
  const effectiveMedian = medianCount > 0 ? medianCount : 1;
  
  // Find spikes
  const spikes: TimelineSpikeCard[] = [];
  const computedAt = new Date().toISOString();
  
  for (const { dateKey, count, entries: dayEntries } of dayCounts) {
    const multiplier = count / effectiveMedian;
    
    // Check if this qualifies as a spike
    if (multiplier >= SPIKE_CONFIG.minMultiplier && count >= SPIKE_CONFIG.minCount) {
      // Build evidence array from entries on this day
      const evidence: InsightEvidence[] = dayEntries.map(entry => ({
        entryId: entry.id,
        timestamp: entry.createdAt,
        preview: createPreview(entry.plaintext),
      }));
      
      // Sort evidence by timestamp (earliest first)
      evidence.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const formattedDate = formatDateForDisplay(dateKey);
      const roundedMultiplier = Math.round(multiplier * 10) / 10;
      
      const spikeData: TimelineSpikeData = {
        date: dateKey,
        count,
        medianCount: Math.round(effectiveMedian * 10) / 10,
        multiplier: roundedMultiplier,
      };
      
      const card: TimelineSpikeCard = {
        id: generateInsightId('timeline_spike', dateKey),
        kind: 'timeline_spike',
        title: `Writing spike on ${formattedDate}`,
        explanation: `You wrote ${count} ${count === 1 ? 'entry' : 'entries'} on this day, which is ${roundedMultiplier}× your usual daily activity.`,
        evidence,
        computedAt,
        data: spikeData,
      };
      
      spikes.push(card);
    }
  }
  
  // Sort spikes by date (most recent first)
  spikes.sort((a, b) => b.data.date.localeCompare(a.data.date));
  
  return spikes;
}

/**
 * Helper to convert Item (from entries.ts) to ReflectionEntry format
 * This bridges the existing data structures with the insight engine
 */
export function itemToReflectionEntry(
  item: {
    id: string;
    createdAt: Date;
    deletedAt: Date | null;
    plaintext: unknown;
  },
  getSourceIdFor?: (reflectionId: string) => string | undefined
): ReflectionEntry {
  // Surface a sourceId if it is already present on the plaintext payload
  // or from the reflection links (if getSourceIdFor is provided and is a function)
  let overrideSource: string | undefined = undefined;
  if (getSourceIdFor && typeof getSourceIdFor === 'function') {
    try {
      overrideSource = getSourceIdFor(item.id);
    } catch (err) {
      // Silently handle errors from getSourceIdFor
      if (process.env.NODE_ENV === 'development') {
        console.warn('[timelineSpikes] Error calling getSourceIdFor:', err);
      }
    }
  }
  
  const sourceId =
    overrideSource !== undefined
      ? overrideSource || undefined
      : typeof item.plaintext === 'object' &&
        item.plaintext !== null &&
        'sourceId' in item.plaintext
      ? String((item.plaintext as { sourceId?: unknown }).sourceId ?? '')
      : undefined;

  // Extract text from plaintext which could be:
  // - An object with { text: string }
  // - A string directly
  // - Something else (stringify it)
  let text: string;
  
  if (typeof item.plaintext === 'object' && item.plaintext !== null && 'text' in item.plaintext) {
    text = String((item.plaintext as { text: unknown }).text);
  } else if (typeof item.plaintext === 'string') {
    text = item.plaintext;
  } else {
    text = JSON.stringify(item.plaintext);
  }
  
  return {
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null,
    sourceId: sourceId || undefined,
    plaintext: text,
  };
}

/**
 * @deprecated This function is no longer needed with real reflection_links.
 * Kept for backward compatibility but returns reflections unchanged.
 */
export function attachDemoSourceLinks(reflections: ReflectionEntry[]): ReflectionEntry[] {
  // No-op: real source links are now handled via reflection_links table
  return reflections;
}

