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
 * Represents a bucket of reflections matching a particular topic
 */
export type TopicDriftBucket = {
  topic: string;
  count: number;
  sampleTitles: string[];
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
 * Compute topic drift buckets from decrypted reflection entries
 * 
 * This is a PURE FUNCTION - it has no side effects and makes no network calls.
 * All data must already be decrypted and in memory.
 * 
 * Algorithm:
 * 1. Scan each reflection's plaintext for topic keywords (case insensitive)
 * 2. Build counts per topic
 * 3. Collect up to 3 sample titles for each matched topic
 * 4. Sort buckets descending by count
 * 5. Return at most 5 topics
 * 
 * @param entries - Array of decrypted reflection entries
 * @returns Array of TopicDriftBucket sorted by count descending
 */
export function computeTopicDrift(entries: ReflectionEntry[]): TopicDriftBucket[] {
  // Filter out deleted entries
  const activeEntries = entries.filter(e => !e.deletedAt);
  
  if (activeEntries.length === 0) {
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
  
  // Build bucket array from topics that have matches
  const buckets: TopicDriftBucket[] = [];
  
  for (const [topic, data] of Object.entries(topicData)) {
    if (data.count > 0) {
      buckets.push({
        topic,
        count: data.count,
        sampleTitles: data.sampleTitles,
      });
    }
  }
  
  // Sort by count descending
  buckets.sort((a, b) => b.count - a.count);
  
  // Return at most MAX_TOPICS
  return buckets.slice(0, MAX_TOPICS);
}

