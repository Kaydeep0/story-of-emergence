// src/app/lib/insights/computeWeeklyArtifact.ts
// Compute Weekly InsightArtifact using existing pure compute functions
// Part of Phase 4.0.1: Consolidate Weekly compute into the Insight Engine

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { computeAlwaysOnSummary } from './alwaysOnSummary';
import { computeTimelineSpikes, itemToReflectionEntry } from './timelineSpikes';

/**
 * Convert InternalEvent or UnifiedInternalEvent to ReflectionEntry format
 * Only includes journal events (sourceKind === "journal" && eventKind === "written")
 */
function eventsToReflectionEntries(
  events: (InternalEvent | UnifiedInternalEvent)[]
): ReflectionEntry[] {
  const entries: ReflectionEntry[] = [];
  
  for (const ev of events) {
    const eventAt = typeof ev.eventAt === 'string' ? new Date(ev.eventAt) : ev.eventAt;
    
    // Determine if this is a UnifiedInternalEvent or legacy InternalEvent
    const isUnified = 'sourceKind' in ev;
    
    let sourceKind: string | undefined;
    let eventKind: string | undefined;
    let plaintext: string | undefined;
    
    if (isUnified) {
      const unified = ev as UnifiedInternalEvent;
      sourceKind = unified.sourceKind;
      eventKind = unified.eventKind;
      plaintext = unified.details;
    } else {
      const internal = ev as InternalEvent;
      const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
      sourceKind = payload.source_kind as string | undefined;
      eventKind = payload.event_kind as string | undefined;
      
      if (typeof payload?.content === 'string') {
        plaintext = payload.content;
      } else if (typeof payload?.raw_metadata === 'object' && payload.raw_metadata !== null) {
        const rawMeta = payload.raw_metadata as Record<string, unknown>;
        if (typeof rawMeta.content === 'string') {
          plaintext = rawMeta.content;
        }
      }
    }
    
    // Only include journal events
    if (sourceKind === 'journal' && eventKind === 'written' && plaintext) {
      entries.push({
        id: `weekly-entry-${entries.length}`,
        createdAt: eventAt.toISOString(),
        plaintext,
      });
    }
  }
  
  return entries;
}

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
  const cards: InsightCard[] = [
    ...alwaysOnSummary,
    ...timelineSpikes,
  ];
  
  // Fallback: if no cards generated but we have events, create a baseline card
  // This ensures Weekly always shows something when there are reflections this week
  if (cards.length === 0 && events.length > 0) {
    cards.push({
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
    } as InsightCard);
  }
  
  // Generate artifact ID (deterministic based on window)
  const startDateStr = windowStart.toISOString().split('T')[0];
  const endDateStr = windowEnd.toISOString().split('T')[0];
  const artifactId = `weekly-${startDateStr}-${endDateStr}`;
  
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
  };
  
  return artifact;
}

