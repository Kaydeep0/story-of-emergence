/**
 * src/app/lib/insights/contrastPairs.ts
 * 
 * Contrast Pairs detection module - surfaces rising vs fading topic pairs.
 * This module consumes pre-computed TopicDriftBucket data and finds
 * meaningful contrasts between topics trending in opposite directions.
 * 
 * Pure function, no database calls, no Supabase dependencies.
 */

import type { TopicDriftBucket, TopicTrend } from './topicDrift';

/**
 * Represents a contrast pair showing a rising topic vs a fading topic
 */
export type ContrastPair = {
  topicA: string;
  topicB: string;
  trendA: TopicTrend;
  trendB: TopicTrend;
  score: number;
  summary: string;
};

/**
 * Minimum count for a topic to be considered for pairing
 * Avoids noise from topics with very few matches
 */
const MIN_COUNT = 2;

/**
 * Maximum number of contrast pairs to return
 */
const MAX_PAIRS = 3;

/**
 * Capitalize the first letter of a string
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convert strength label to numeric weight for scoring
 * Higher weight indicates stronger drift magnitude
 */
function strengthWeight(label: TopicDriftBucket['strengthLabel']): number {
  if (label === 'high') return 3;
  if (label === 'medium') return 2;
  return 1; // low
}

/**
 * Compute contrast pairs from topic drift buckets
 * 
 * This is a PURE FUNCTION - it has no side effects and makes no network calls.
 * All data must already be computed and in memory.
 * 
 * Algorithm:
 * 1. Filter buckets to only those with count >= 2
 * 2. Split into rising and fading lists
 * 3. For every combination of one rising and one fading topic, build a ContrastPair
 * 4. Score balances frequency (count) and drift intensity (strengthLabel weight)
 * 5. Sort descending by score
 * 6. Return top 3 pairs
 * 
 * @param buckets - Array of TopicDriftBucket from computeTopicDrift
 * @returns Array of ContrastPair sorted by score descending (max 3)
 */
export function computeContrastPairs(buckets: TopicDriftBucket[]): ContrastPair[] {
  // Filter to buckets with enough data to be meaningful
  const validBuckets = buckets.filter(b => b.count >= MIN_COUNT);
  
  // Split into rising and fading
  const rising = validBuckets.filter(b => b.trend === 'rising');
  const fading = validBuckets.filter(b => b.trend === 'fading');
  
  // If we don't have at least one of each, no pairs possible
  if (rising.length === 0 || fading.length === 0) {
    return [];
  }
  
  // Build all combinations of rising × fading
  const pairs: ContrastPair[] = [];
  
  for (const r of rising) {
    for (const f of fading) {
      const weightA = strengthWeight(r.strengthLabel);
      const weightB = strengthWeight(f.strengthLabel);
      
      // base counts
      const base = r.count + f.count;
      
      // final score balances frequency and drift intensity
      const score = base * (weightA + weightB);
      
      const summary = `${capitalize(r.topic)} is rising while ${capitalize(f.topic)} is fading over the last month.`;
      
      pairs.push({
        topicA: r.topic,
        topicB: f.topic,
        trendA: r.trend,
        trendB: f.trend,
        score,
        summary,
      });
    }
  }
  
  // Sort by score descending
  pairs.sort((a, b) => b.score - a.score);
  
  // Return top MAX_PAIRS
  return pairs.slice(0, MAX_PAIRS);
}
