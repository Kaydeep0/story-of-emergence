// src/app/lib/insights/computeSummaryArtifact.ts
// Compute Summary InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { computeAlwaysOnSummary } from './alwaysOnSummary';

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
        id: `summary-entry-${entries.length}`,
        createdAt: eventAt.toISOString(),
        plaintext,
      });
    }
  }
  
  return entries;
}

/**
 * Compute Summary InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - computeAlwaysOnSummary for summary insights
 * 
 * Returns InsightArtifact with cards ordered as UI expects
 */
export function computeSummaryArtifact(args: {
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
  
  // Convert AlwaysOnSummaryCard[] to InsightCard[] (they're compatible)
  const cards: InsightCard[] = [...alwaysOnSummary];
  
  // Generate artifact ID (deterministic based on window)
  const startDateStr = windowStart.toISOString().split('T')[0];
  const endDateStr = windowEnd.toISOString().split('T')[0];
  const artifactId = `summary-${startDateStr}-${endDateStr}`;
  
  const artifact: InsightArtifact = {
    horizon: 'summary',
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

