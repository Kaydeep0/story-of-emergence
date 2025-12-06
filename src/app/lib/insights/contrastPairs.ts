/**
 * src/app/lib/insights/contrastPairs.ts
 * 
 * Phase Four scaffolding - Contrast Pairs detection module
 * Currently only used for console debugging in the Timeline flow.
 * 
 * This module provides a pure, synchronous function to detect contrast pairs
 * by comparing topic counts across reflections, finding high vs low pairs.
 * No database calls, no Supabase dependencies.
 */

import type { ReflectionEntry } from './types';

/**
 * Represents a contrast pair showing high vs low topic comparison
 */
export type ContrastPair = {
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftCount: number;
  rightCount: number;
  sampleLeftTitles: string[];
  sampleRightTitles: string[];
};

/**
 * Keyword map for topic detection (same as topicDrift)
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
 * Maximum sample titles per topic side
 */
const MAX_SAMPLE_TITLES = 3;

/**
 * Minimum entries required to compute contrast pairs
 */
const MIN_ENTRIES = 20;

/**
 * Minimum number of topics with matches to generate a contrast pair
 */
const MIN_TOPICS_WITH_MATCHES = 2;

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
 * Compute contrast pairs from decrypted reflection entries
 * 
 * This is a PURE FUNCTION - it has no side effects and makes no network calls.
 * All data must already be decrypted and in memory.
 * 
 * Algorithm:
 * 1. Return empty if fewer than 20 entries
 * 2. Scan each reflection's plaintext for topic keywords (case insensitive)
 * 3. Build counts and sample titles per topic
 * 4. Find the topic with highest count and the topic with lowest non-zero count
 * 5. Return a single contrast pair if at least 2 topics have matches
 * 
 * @param entries - Array of decrypted reflection entries
 * @returns Array of ContrastPair (0 or 1 items)
 */
export function computeContrastPairs(entries: ReflectionEntry[]): ContrastPair[] {
  // Filter out deleted entries
  const activeEntries = entries.filter(e => !e.deletedAt);
  
  // Return empty if fewer than MIN_ENTRIES
  if (activeEntries.length < MIN_ENTRIES) {
    return [];
  }
  
  // Track counts and sample titles per topic
  const topicData: Record<string, { count: number; sampleTitles: string[] }> = {};
  
  // Initialize all topics
  for (const topic of Object.keys(TOPIC_KEYWORDS)) {
    topicData[topic] = { count: 0, sampleTitles: [] };
  }
  
  // Scan each entry for topic matches
  for (const entry of activeEntries) {
    const text = entry.plaintext;
    
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (textMatchesTopic(text, keywords)) {
        topicData[topic].count += 1;
        
        // Add sample title if we haven't reached the limit
        if (topicData[topic].sampleTitles.length < MAX_SAMPLE_TITLES) {
          topicData[topic].sampleTitles.push(createTitlePreview(text));
        }
      }
    }
  }
  
  // Filter topics with at least one match
  const topicsWithMatches = Object.entries(topicData)
    .filter(([, data]) => data.count > 0)
    .map(([topic, data]) => ({ topic, ...data }));
  
  // Need at least 2 topics with matches to form a contrast pair
  if (topicsWithMatches.length < MIN_TOPICS_WITH_MATCHES) {
    return [];
  }
  
  // Sort by count descending to find highest
  topicsWithMatches.sort((a, b) => b.count - a.count);
  
  // Highest count is first, lowest non-zero is last
  const highest = topicsWithMatches[0];
  const lowest = topicsWithMatches[topicsWithMatches.length - 1];
  
  // Build the contrast pair
  const contrastPair: ContrastPair = {
    title: 'Where your writing shifted',
    leftLabel: highest.topic,
    rightLabel: lowest.topic,
    leftCount: highest.count,
    rightCount: lowest.count,
    sampleLeftTitles: highest.sampleTitles,
    sampleRightTitles: lowest.sampleTitles,
  };
  
  return [contrastPair];
}

