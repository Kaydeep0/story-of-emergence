/**
 * src/app/lib/insights/topicDrift.ts
 * 
 * Phase Four scaffolding - Topic Drift detection module
 * Currently only used for console debugging in the Timeline flow.
 * 
 * This module provides a pure, synchronous function to detect topic drift
 * by scanning reflection text for predefined keywords and building counts
 * per topic. No database calls, no Supabase dependencies.
 */

import type { ReflectionEntry } from './types';

/**
 * Trend direction for a topic over the lookback period
 */
export type TopicTrend = 'rising' | 'stable' | 'fading';

/**
 * Strength label indicating magnitude of drift
 */
export type TopicStrengthLabel = 'high' | 'medium' | 'low';

/**
 * Represents a bucket of reflections matching a particular topic
 */
export type TopicDriftBucket = {
  topic: string;
  count: number;
  sampleTitles: string[];
  trend: TopicTrend;
  strengthLabel: TopicStrengthLabel;
};

/**
 * Keyword map for topic detection
 * Each key is a topic name, values are keywords that indicate that topic
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  focus: ['focus', 'concentrate', 'attention', 'distracted', 'productive', 'flow'],
  work: ['work', 'job', 'career', 'office', 'meeting', 'project', 'deadline', 'colleague'],
  money: ['money', 'finance', 'budget', 'savings', 'investment', 'expense', 'income', 'salary'],
  health: ['health', 'exercise', 'sleep', 'tired', 'energy', 'workout', 'meditation', 'stress'],
  relationships: ['relationship', 'friend', 'family', 'partner', 'love', 'connection', 'social'],
};

/**
 * Maximum number of topics to return
 */
const MAX_TOPICS = 5;

/**
 * Maximum sample titles per topic
 */
const MAX_SAMPLE_TITLES = 3;

/**
 * Lookback window in days for trend computation
 */
const LOOKBACK_DAYS = 28;

/**
 * Half of the lookback window (for comparing older vs newer)
 */
const HALF_WINDOW_DAYS = 14;

/**
 * Threshold for rising trend: newer count must be >= this multiplier of older count
 */
const RISING_THRESHOLD = 1.5;

/**
 * Threshold for fading trend: newer count must be <= this fraction of older count
 */
const FADING_THRESHOLD = 2 / 3;

/**
 * Create a short title preview from entry plaintext
 */
function createTitlePreview(plaintext: string, maxLength = 40): string {
  const cleaned = plaintext.trim().replace(/\s+/g, ' ');
  // Take the first line or first N chars, whichever is shorter
  const firstLine = cleaned.split('\n')[0];
  const text = firstLine.length <= maxLength ? firstLine : firstLine.slice(0, maxLength).trim() + '…';
  return text || '(untitled)';
}

/**
 * Check if text contains any of the keywords (case insensitive)
 */
function textMatchesTopic(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Determine the trend for a topic based on older vs newer counts
 */
function determineTrend(olderCount: number, newerCount: number): TopicTrend {
  // Handle edge case where older count is zero
  if (olderCount === 0) {
    return newerCount > 0 ? 'rising' : 'stable';
  }
  
  const ratio = newerCount / olderCount;
  
  if (ratio >= RISING_THRESHOLD) {
    return 'rising';
  } else if (ratio <= FADING_THRESHOLD) {
    return 'fading';
  }
  return 'stable';
}

/**
 * Calculate the change strength for sorting
 * Positive for rising (larger = stronger), negative for fading (more negative = stronger fade)
 */
function calculateChangeStrength(olderCount: number, newerCount: number): number {
  return newerCount - olderCount;
}

/**
 * Determine the strength label based on absolute change strength
 * - High Drift: |strength| >= 3
 * - Medium Drift: |strength| == 2
 * - Low Drift: |strength| <= 1
 */
function determineStrengthLabel(olderCount: number, newerCount: number): TopicStrengthLabel {
  const absStrength = Math.abs(newerCount - olderCount);
  
  if (absStrength >= 3) {
    return 'high';
  } else if (absStrength === 2) {
    return 'medium';
  }
  return 'low';
}

/**
 * Compute topic drift buckets from decrypted reflection entries
 * 
 * This is a PURE FUNCTION - it has no side effects and makes no network calls.
 * All data must already be decrypted and in memory.
 * 
 * Algorithm:
 * 1. Define a 28-day lookback window split into two 14-day halves
 * 2. Scan each reflection's plaintext for topic keywords (case insensitive)
 * 3. Build counts per topic for both older and newer halves
 * 4. Compute trend based on the ratio of newer to older counts
 * 5. Sort by trend strength: rising first (by positive delta), then stable (by count), then fading
 * 6. Return at most 5 topics
 * 
 * @param entries - Array of decrypted reflection entries
 * @param now - Optional date for testing (defaults to current time)
 * @returns Array of TopicDriftBucket sorted by trend strength
 */
export function computeTopicDrift(entries: ReflectionEntry[], now?: Date): TopicDriftBucket[] {
  // Filter out deleted entries
  const activeEntries = entries.filter(e => !e.deletedAt);
  
  if (activeEntries.length === 0) {
    return [];
  }
  
  // Calculate date boundaries
  const currentDate = now ?? new Date();
  const midpointDate = new Date(currentDate.getTime() - HALF_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const startDate = new Date(currentDate.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  
  // Track counts and sample titles per topic, split by time window
  type TopicAccumulator = {
    olderCount: number;  // entries in older half (startDate to midpoint)
    newerCount: number;  // entries in newer half (midpoint to now)
    totalCount: number;
    sampleTitles: string[];
  };
  
  const topicData: Record<string, TopicAccumulator> = {};
  
  // Initialize all topics
  for (const topic of Object.keys(TOPIC_KEYWORDS)) {
    topicData[topic] = { olderCount: 0, newerCount: 0, totalCount: 0, sampleTitles: [] };
  }
  
  // Scan each entry for topic matches
  for (const entry of activeEntries) {
    const entryDate = new Date(entry.createdAt);
    const text = entry.plaintext;
    
    // Determine which time window this entry falls into
    const isInLookback = entryDate >= startDate && entryDate <= currentDate;
    const isNewer = entryDate >= midpointDate && entryDate <= currentDate;
    const isOlder = entryDate >= startDate && entryDate < midpointDate;
    
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (textMatchesTopic(text, keywords)) {
        // Always count toward total (for all entries, not just lookback)
        topicData[topic].totalCount += 1;
        
        // Count toward time windows if within lookback period
        if (isInLookback) {
          if (isNewer) {
            topicData[topic].newerCount += 1;
          } else if (isOlder) {
            topicData[topic].olderCount += 1;
          }
        }
        
        // Add sample title if we haven't reached the limit
        if (topicData[topic].sampleTitles.length < MAX_SAMPLE_TITLES) {
          topicData[topic].sampleTitles.push(createTitlePreview(text));
        }
      }
    }
  }
  
  // Build bucket array from topics that have matches
  const buckets: TopicDriftBucket[] = [];
  
  for (const [topic, data] of Object.entries(topicData)) {
    if (data.totalCount > 0) {
      const trend = determineTrend(data.olderCount, data.newerCount);
      const strengthLabel = determineStrengthLabel(data.olderCount, data.newerCount);
      buckets.push({
        topic,
        count: data.totalCount,
        sampleTitles: data.sampleTitles,
        trend,
        strengthLabel,
      });
    }
  }
  
  // Sort by trend strength:
  // 1. Rising topics first (sorted by positive change strength, largest first)
  // 2. Stable topics next (sorted by total count, largest first)
  // 3. Fading topics last (sorted by negative change strength, smallest fade first)
  buckets.sort((a, b) => {
    const dataA = topicData[a.topic];
    const dataB = topicData[b.topic];
    
    const trendOrder: Record<TopicTrend, number> = { rising: 0, stable: 1, fading: 2 };
    const orderA = trendOrder[a.trend];
    const orderB = trendOrder[b.trend];
    
    // First sort by trend category
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Within same trend category, sort by strength or count
    if (a.trend === 'rising') {
      // Rising: larger positive change first
      const strengthA = calculateChangeStrength(dataA.olderCount, dataA.newerCount);
      const strengthB = calculateChangeStrength(dataB.olderCount, dataB.newerCount);
      return strengthB - strengthA;
    } else if (a.trend === 'stable') {
      // Stable: larger total count first
      return b.count - a.count;
    } else {
      // Fading: smaller fade (less negative) first
      const strengthA = calculateChangeStrength(dataA.olderCount, dataA.newerCount);
      const strengthB = calculateChangeStrength(dataB.olderCount, dataB.newerCount);
      return strengthB - strengthA;
    }
  });
  
  // Return at most MAX_TOPICS
  return buckets.slice(0, MAX_TOPICS);
}

