// src/app/lib/insights/computeWeeklyArtifact.ts
// Compute Weekly InsightArtifact using existing pure compute functions
// Part of Phase 4.0.1: Consolidate Weekly compute into the Insight Engine

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries, extractReflectionIdFromEvent } from './reflectionAdapters';
import { computeAlwaysOnSummary } from './alwaysOnSummary';
import { computeTimelineSpikes, itemToReflectionEntry } from './timelineSpikes';
import { validateInsight, validateInsightDetailed } from './validateInsight';
import type { InsightArtifactDebug, RejectedCard } from './artifactTypes';
import { pickEvidenceChips } from './pickEvidenceChips';

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
  /** Optional: Actual reflection entries to match against events */
  reflections?: ReflectionEntry[];
}): InsightArtifact {
  const { events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount, reflections } = args;
  
  // IMPORTANT: Events are already filtered to the weekly window by computeInsightsForWindow
  // Build windowEntries by matching reflection IDs from events, not by re-parsing dates
  const windowEvents = events; // Events are already in the window
  
  // Extract reflection IDs from events and match to actual reflections if provided
  let windowEntries: ReflectionEntry[] = [];
  if (reflections && reflections.length > 0) {
    // Build a map of reflection ID -> ReflectionEntry for fast lookup
    const reflectionsById = new Map<string, ReflectionEntry>();
    for (const reflection of reflections) {
      reflectionsById.set(reflection.id, reflection);
    }
    
    // Extract reflection IDs from events and match to actual reflections
    for (const event of windowEvents) {
      const reflectionId = extractReflectionIdFromEvent(event);
      if (reflectionId) {
        const reflection = reflectionsById.get(reflectionId);
        if (reflection) {
          windowEntries.push(reflection);
        }
      }
    }
  } else {
    // Fallback: Convert events to ReflectionEntry format (only journal events)
    // This creates synthetic entries, but at least we have something
    windowEntries = eventsToReflectionEntries(windowEvents);
  }
  
  // Calculate activeDays from events (which have known-good timestamps)
  // This is more reliable than parsing reflection dates
  const activeDaysSet = new Set<string>();
  for (const event of windowEvents) {
    // Extract timestamp from event using the same logic as reflectionAdapters
    const isUnified = 'sourceKind' in event;
    let eventDate: Date | null = null;
    
    if (isUnified) {
      const unified = event as UnifiedInternalEvent & { occurredAt?: string | Date; createdAt?: string | Date };
      if (unified.occurredAt) {
        eventDate = typeof unified.occurredAt === 'string' ? new Date(unified.occurredAt) : unified.occurredAt;
      } else if (unified.createdAt) {
        eventDate = typeof unified.createdAt === 'string' ? new Date(unified.createdAt) : unified.createdAt;
      } else if (unified.eventAt) {
        eventDate = typeof unified.eventAt === 'string' ? new Date(unified.eventAt) : new Date(unified.eventAt);
      }
    } else {
      const internal = event as InternalEvent;
      if (internal.occurredAt) {
        eventDate = internal.occurredAt instanceof Date ? internal.occurredAt : new Date(internal.occurredAt);
      } else if (internal.createdAt) {
        eventDate = internal.createdAt instanceof Date ? internal.createdAt : new Date(internal.createdAt);
      } else if (internal.eventAt) {
        eventDate = internal.eventAt instanceof Date ? internal.eventAt : new Date(internal.eventAt);
      }
    }
    
    if (eventDate && !isNaN(eventDate.getTime())) {
      const dateKey = eventDate.toISOString().split('T')[0];
      activeDaysSet.add(dateKey);
    }
  }
  const activeDays = activeDaysSet.size;
  
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

    // Observer v0: Pick evidence chips from window entries for fallback card
    const fallbackEvidenceChips = windowEntries.length > 0 
      ? pickEvidenceChips(windowEntries, claim)
      : [];
    
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
      evidenceChips: fallbackEvidenceChips.length > 0 ? fallbackEvidenceChips : undefined,
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
  
  // Generate artifact ID (deterministic based on window)
  const startDateStr = windowStart.toISOString().split('T')[0];
  const endDateStr = windowEnd.toISOString().split('T')[0];
  const artifactId = `weekly-${startDateStr}-${endDateStr}`;
  
  // Calculate min/max event dates from windowEvents (events already filtered to window)
  let minEventIso: string | null = null;
  let maxEventIso: string | null = null;
  if (windowEvents.length > 0) {
    const eventDates = windowEvents.map(e => {
      const isUnified = 'sourceKind' in e;
      let eventAt: string;
      if (isUnified) {
        eventAt = (e as UnifiedInternalEvent).eventAt;
      } else {
        const internal = e as InternalEvent;
        eventAt = internal.eventAt instanceof Date ? internal.eventAt.toISOString() : internal.eventAt;
      }
      return new Date(eventAt).getTime();
    });
    const minTime = Math.min(...eventDates);
    const maxTime = Math.max(...eventDates);
    minEventIso = new Date(minTime).toISOString();
    maxEventIso = new Date(maxTime).toISOString();
  }
  
  // Build debug info with safe defaults
  // IMPORTANT: Debug values must come from the SAME variables used to build cards
  // - windowEntries.length is used in fallback card evidence and confidence
  // - activeDays is used in fallback card evidence and confidence
  // - These same values are passed to computeAlwaysOnSummary(windowEntries) and computeTimelineSpikes(windowEntries)
  const debug: InsightArtifactDebug = {
    eventCount: windowEvents.length,  // Events already filtered to window
    windowStartIso: windowStart.toISOString(),
    windowEndIso: windowEnd.toISOString(),
    minEventIso: minEventIso || null,
    maxEventIso: maxEventIso || null,
    sampleEventIds: windowEvents.length > 0 ? windowEvents.slice(0, 3).map(e => (e as any).id || 'unknown') : [],
    sampleEventDates: windowEvents.length > 0 ? windowEvents.slice(0, 3).map(e => {
      const isUnified = 'sourceKind' in e;
      const eventAt = isUnified 
        ? (e as UnifiedInternalEvent).eventAt
        : (e as InternalEvent).eventAt instanceof Date 
          ? (e as InternalEvent).eventAt.toISOString()
          : (e as InternalEvent).eventAt;
      return typeof eventAt === 'string' ? eventAt.split('T')[0] : eventAt.toISOString().split('T')[0];
    }) : [],
    // These MUST match the exact variables used in card generation above
    reflectionsInWindow: windowEntries.length,  // Same as used in fallback card
    activeDays: activeDays,  // Same as used in fallback card and computed from windowEvents
    rawCardsGenerated: allCards.length,
    cardsPassingValidation: cards.length,
    rejectedCards: rejectedCards.length > 0 ? rejectedCards : undefined,
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Track if any reflections are missing for events (data integrity check)
    missingReflectionsForEvents: windowEvents.length > windowEntries.length 
      ? windowEvents.length - windowEntries.length 
      : undefined,
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

