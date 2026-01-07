// src/app/lib/insights/computeTimelineArtifact.ts
// Compute Timeline InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeTimelineSpikes } from './timelineSpikes';
import { computeLinkClusters } from './linkClusters';
import { computeTopicDrift } from './topicDrift';
import { computeContrastPairs } from './contrastPairs';
import { detectTimelineEvents, timelineEventToCard } from './timelineEvents';
import { validateInsight } from './validateInsight';
import type { TopicDriftBucket } from './topicDrift';
import type { ContrastPair } from './contrastPairs';


/**
 * Convert TopicDriftBucket to InsightCard
 * Stores original bucket data as metadata for reconstruction
 */
function topicDriftBucketToCard(bucket: TopicDriftBucket, index: number): InsightCard & { _topicDriftBucket?: TopicDriftBucket } {
  const trendLabels: Record<TopicDriftBucket['trend'], string> = {
    rising: 'Rising',
    stable: 'Stable',
    fading: 'Fading',
  };
  
  const strengthLabels: Record<TopicDriftBucket['strengthLabel'], string> = {
    high: 'High Drift',
    medium: 'Medium Drift',
    low: 'Low Drift',
  };
  
  return {
    id: `topic-drift-${bucket.topic}-${index}`,
    kind: 'topic_cluster',
    title: bucket.topic,
    explanation: `${bucket.count} mentions in the last 28 days. Trend: ${trendLabels[bucket.trend]}, Strength: ${strengthLabels[bucket.strengthLabel]}`,
    evidence: [],
    computedAt: new Date().toISOString(),
    _topicDriftBucket: bucket, // Store original data for reconstruction
  };
}

/**
 * Convert ContrastPair to InsightCard
 * Stores original pair data as metadata for reconstruction
 */
function contrastPairToCard(pair: ContrastPair, index: number): InsightCard & { _contrastPair?: ContrastPair } {
  const trendLabels: Record<ContrastPair['trendA'], string> = {
    rising: 'Rising',
    stable: 'Stable',
    fading: 'Fading',
  };
  
  return {
    id: `contrast-pair-${pair.topicA}-${pair.topicB}-${index}`,
    kind: 'topic_cluster',
    title: `${pair.topicA} vs ${pair.topicB}`,
    explanation: pair.summary,
    evidence: [],
    computedAt: new Date().toISOString(),
    _contrastPair: pair, // Store original data for reconstruction
  };
}

/**
 * Compute Timeline InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - computeTimelineSpikes for activity spikes
 * - computeLinkClusters for link clusters
 * - computeTopicDrift for topic drift buckets
 * - computeContrastPairs for contrast pairs
 * 
 * Returns InsightArtifact with cards ordered as UI expects
 */
export function computeTimelineArtifact(args: {
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
  
  // Filter entries to window
  const windowEntries = allReflectionEntries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    return createdAt >= windowStart && createdAt <= windowEnd;
  });
  
  // Compute timeline events (NEW: Discrete moments, not continuous curves)
  const timelineEvents = detectTimelineEvents(windowEntries);
  const eventCards = timelineEvents.map(timelineEventToCard);
  
  // Compute insights using existing pure functions
  // Suppress graphs if events exist - events matter more
  const spikes = eventCards.length === 0 ? computeTimelineSpikes(windowEntries) : [];
  const clusters = computeLinkClusters(windowEntries);
  const topicDrift = computeTopicDrift(windowEntries);
  const contrastPairs = computeContrastPairs(topicDrift);
  
  // Convert all to InsightCard[] format
  // Events come first (most important)
  // Spikes and clusters are already InsightCards
  // TopicDriftBucket and ContrastPair are converted to InsightCards with metadata
  const allCards: InsightCard[] = [
    ...eventCards, // Timeline events first
    ...spikes,
    ...clusters,
    ...topicDrift.map((bucket, idx) => topicDriftBucketToCard(bucket, idx)),
    ...contrastPairs.map((pair, idx) => contrastPairToCard(pair, idx)),
  ] as InsightCard[];

  // Insight Contract Gatekeeper: Only render contract-compliant insights
  // Non-compliant insights fail silently (no warnings, no placeholders)
  const cards = allCards.filter(validateInsight);
  
  const artifact: InsightArtifact = {
    horizon: 'timeline',
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

