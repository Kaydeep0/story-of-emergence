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
 * Safe date parsing helper
 * Handles various input types and returns null for invalid dates
 */
function toDateSafe(input: any): Date | null {
  if (input == null) return null;

  // If it's already a Date
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  // If it's a number, detect seconds vs milliseconds
  if (typeof input === "number") {
    const ms = input < 1e12 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // If it's a string, try parse
  if (typeof input === "string") {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;

    // Last resort: if it looks like a locale string, Date() may still fail.
    // Return null instead of a broken Date.
    return null;
  }

  return null;
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
  
  // Filter entries to window using safe date parsing
  const windowEntries: ReflectionEntry[] = [];
  let invalidReflectionDates = 0;
  let sampleInvalidDateRaw: any = null;
  
  for (const entry of allReflectionEntries) {
    // Try multiple possible date fields
    const created = toDateSafe(
      (entry as any).created_at ?? 
      entry.createdAt ?? 
      (entry as any).createdAtIso ?? 
      (entry as any).timestamp
    );
    
    if (!created) {
      invalidReflectionDates++;
      if (!sampleInvalidDateRaw) {
        sampleInvalidDateRaw = (entry as any).created_at ?? entry.createdAt ?? (entry as any).createdAtIso ?? (entry as any).timestamp;
      }
      continue; // Skip entries with invalid dates
    }
    
    // Check if date falls within window using getTime() for precise comparison
    const createdTime = created.getTime();
    const windowStartTime = windowStart.getTime();
    const windowEndTime = windowEnd.getTime();
    
    if (createdTime >= windowStartTime && createdTime <= windowEndTime) {
      windowEntries.push(entry);
    }
  }
  
  // Compute insights using existing pure functions
  const alwaysOnSummary = computeAlwaysOnSummary(windowEntries);
  const timelineSpikes = computeTimelineSpikes(windowEntries);
  
  // Calculate activeDays early (needed for fallback card)
  const activeDaysSet = new Set<string>();
  for (const entry of windowEntries) {
    const created = toDateSafe(
      (entry as any).created_at ?? 
      entry.createdAt ?? 
      (entry as any).createdAtIso ?? 
      (entry as any).timestamp
    );
    if (created) {
      const dateKey = created.toISOString().split('T')[0];
      activeDaysSet.add(dateKey);
    }
  }
  const activeDays = activeDaysSet.size;
  
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
    // CLAIM: User wrote reflections this week
    const claim = `You wrote ${events.length} reflection${events.length === 1 ? '' : 's'} this week.`;
    
    // EVIDENCE: Concrete metrics
    const evidenceItems: string[] = [
      `${events.length} reflection${events.length === 1 ? '' : 's'} in the current week`,
      `Window: ${windowStart.toISOString().split('T')[0]} to ${windowEnd.toISOString().split('T')[0]}`,
    ];
    
    if (windowEntries.length > 0) {
      evidenceItems.push(`${windowEntries.length} reflection${windowEntries.length === 1 ? '' : 's'} with valid timestamps in window`);
      if (activeDays > 0) {
        evidenceItems.push(`${activeDays} active day${activeDays === 1 ? '' : 's'} with entries`);
      }
    }
    
    // CONTRAST: What didn't happen
    const contrast = `No reflections were written outside this week's window. Activity is contained to the current 7-day period.`;
    
    // CONFIDENCE: Why we're confident
    const confidence = `Pattern computed over the last 7 days (${windowStart.toISOString().split('T')[0]} to ${windowEnd.toISOString().split('T')[0]}) with ${windowEntries.length} valid reflection${windowEntries.length === 1 ? '' : 's'} and ${activeDays} active day${activeDays === 1 ? '' : 's'}.`;
    
    const explanation = `${claim}\n\nEvidence:\n${evidenceItems.map(e => `• ${e}`).join('\n')}\n\nContrast: ${contrast}\n\nConfidence: ${confidence}`;
    
    const fallbackCard: InsightCard = {
      id: `weekly-fallback-${windowStart.toISOString()}`,
      kind: 'always_on_summary',
      title: 'This week',
      headline: 'This week',
      explanation,
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
  
  // Calculate debug metrics (activeDays already computed above)
  const reflectionsInWindow = windowEntries.length;
  
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
    invalidReflectionDates: invalidReflectionDates > 0 ? invalidReflectionDates : undefined,
    sampleInvalidDateRaw: sampleInvalidDateRaw !== null ? String(sampleInvalidDateRaw) : undefined,
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

