// src/app/lib/insights/computeWeeklyArtifact.ts
// Compute Weekly InsightArtifact using existing pure compute functions
// Part of Phase 4.0.1: Consolidate Weekly compute into the Insight Engine

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeAlwaysOnSummary } from './alwaysOnSummary';
import { computeTimelineSpikes, itemToReflectionEntry } from './timelineSpikes';
import { validateInsight, validateInsightDetailed } from './validateInsight';
import type { InsightArtifactDebug, RejectedCard } from './artifactTypes';


/**
 * Compute Weekly InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - computeAlwaysOnSummary for weekly patterns
 * - computeTimelineSpikes for activity spikes
 * 
 * Returns InsightArtifact with cards ordered as UI expects
 */
export function computeWeeklyArtifact(args: {
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
  
  // Compute insights using existing pure functions
  const alwaysOnSummary = computeAlwaysOnSummary(windowEntries);
  const timelineSpikes = computeTimelineSpikes(windowEntries);
  
  // Combine cards in the order UI expects:
  // 1. Engine-generated cards first (always-on summary, timeline spikes)
  // 2. Fallback card only if engine produces no cards but events exist
  const allCards: InsightCard[] = [
    ...alwaysOnSummary,
    ...timelineSpikes,
  ];
  
  // Fallback: if no cards generated but we have events, create a baseline card
  // This ensures Weekly always shows something when there are reflections this week
  // NOTE: Fallback card will be filtered by Insight Contract Gatekeeper if non-compliant
  if (allCards.length === 0 && events.length > 0) {
    const fallbackCard: InsightCard = {
      id: `weekly-fallback-${windowStart.toISOString()}`,
      kind: 'always_on_summary',
      title: 'This week',
      headline: 'This week',
      explanation: `You wrote ${events.length} reflection${events.length === 1 ? '' : 's'} this week.`,
      confidence: 'medium',
      scope: 'week',
      evidence: events.slice(0, 3).map((e) => ({
        entryId: (e as any).id ?? `event-${events.indexOf(e)}`,
        timestamp: typeof e.eventAt === 'string' ? e.eventAt : e.eventAt.toISOString(),
        preview: 'Reflection', // Safe label, no reliance on title field
      })),
      computedAt: new Date().toISOString(),
    } as InsightCard;
    allCards.push(fallbackCard);
  }
  
  // Insight Contract Gatekeeper: Only render contract-compliant insights
  // Non-compliant insights fail silently (no warnings, no placeholders)
  // Collect debug telemetry for validation failures
  const cards: InsightCard[] = [];
  const rejectedCards: RejectedCard[] = [];
  
  for (const card of allCards) {
    const validation = validateInsightDetailed(card);
    if (validation.ok) {
      cards.push(card);
    } else {
      // Collect rejection reasons for debug panel (max 5 rejected cards)
      if (rejectedCards.length < 5) {
        rejectedCards.push({
          title: card.title || '(no title)',
          kind: card.kind,
          reasons: validation.reasons,
        });
      }
    }
  }
  
  // Calculate debug metrics
  const reflectionsInWindow = windowEntries.length;
  const activeDaysSet = new Set<string>();
  for (const entry of windowEntries) {
    const dateKey = new Date(entry.createdAt).toISOString().split('T')[0];
    activeDaysSet.add(dateKey);
  }
  const activeDays = activeDaysSet.size;
  
  // Generate artifact ID (deterministic based on window)
  const startDateStr = windowStart.toISOString().split('T')[0];
  const endDateStr = windowEnd.toISOString().split('T')[0];
  const artifactId = `weekly-${startDateStr}-${endDateStr}`;
  
  // Calculate min/max event dates
  let minEventIso: string | null = null;
  let maxEventIso: string | null = null;
  if (events.length > 0) {
    const eventDates = events.map(e => {
      const eventAt = typeof e.eventAt === 'string' ? e.eventAt : e.eventAt.toISOString();
      return new Date(eventAt).getTime();
    });
    const minTime = Math.min(...eventDates);
    const maxTime = Math.max(...eventDates);
    minEventIso = new Date(minTime).toISOString();
    maxEventIso = new Date(maxTime).toISOString();
  }
  
  // Build debug info with safe defaults
  const debug: InsightArtifactDebug = {
    eventCount: events.length,
    windowStartIso: windowStart.toISOString(),
    windowEndIso: windowEnd.toISOString(),
    minEventIso: minEventIso || null,
    maxEventIso: maxEventIso || null,
    sampleEventIds: events.length > 0 ? events.slice(0, 3).map(e => (e as any).id || 'unknown') : [],
    sampleEventDates: events.length > 0 ? events.slice(0, 3).map(e => {
      const eventAt = typeof e.eventAt === 'string' ? e.eventAt : e.eventAt.toISOString();
      return eventAt.split('T')[0];
    }) : [],
    reflectionsInWindow,
    activeDays,
    rawCardsGenerated: allCards.length,
    cardsPassingValidation: cards.length,
    rejectedCards: rejectedCards.length > 0 ? rejectedCards : undefined,
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  const artifact: InsightArtifact = {
    horizon: 'weekly',
    window: {
      kind: 'week',
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
      timezone,
    },
    createdAt: new Date().toISOString(),
    cards,
    debug,
  };
  
  return artifact;
}

