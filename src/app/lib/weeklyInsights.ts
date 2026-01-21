// src/app/lib/weeklyInsights.ts
//
// LEGACY: Frozen. Weekly lens uses canonical insights engine. Do not extend.
//
// This module is kept for type exports only. The Weekly lens route uses
// computeInsightsForWindow directly. No new code should import computeWeeklyInsights.

import type { InternalEvent } from "./types";
import type { UnifiedInternalEvent } from "../../lib/internalEvents";
import type { TimeWindow } from "./insights/timeWindows";
import { fitHeuristics } from "./insights/distributions";
import { computeInsightsForWindow as computeInsightsForWindowEngine } from "./insights/computeInsightsForWindow";

/**
 * @deprecated Use computeInsightsForWindow from insight engine instead.
 * This function is now a thin wrapper for backward compatibility.
 * Will be removed in Phase 4.1+.
 * 
 * LEGACY: Frozen. Weekly lens uses canonical insights engine. Do not extend.
 */

export type WeeklyInsight = {
  weekId: string;         // e.g. "2025-12-01" for the Monday of that week
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  journalEvents: number;
  avgJournalLength: number;
  topGuessedTopics: string[];
  summaryText: string;
  distributionLabel?: 'normal' | 'lognormal' | 'powerlaw' | 'mixed';
  skew?: number;
  concentrationShareTop10PercentDays?: number;
};

function startOfWeek(date: Date): Date {
  // Monday as start of week
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diff = (day + 6) % 7; // 0 if Monday, 1 if Tuesday, etc
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function endOfWeek(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 7);
  d.setMilliseconds(d.getMilliseconds() - 1);
  return d;
}

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Compute simple weekly insights from a list of internal events.
 * Accepts either legacy InternalEvent[] or UnifiedInternalEvent[].
 * 
 * @deprecated This function is now a wrapper that routes through the insight engine.
 * It maintains backward compatibility by converting InsightArtifact back to WeeklyInsight format.
 * New code should use computeInsightsForWindow from the insight engine directly.
 */
export function computeWeeklyInsights(
  events: InternalEvent[] | UnifiedInternalEvent[]
): WeeklyInsight[] {
  const buckets = new Map<
    string,
    {
      startDate: Date;
      endDate: Date;
      totalEvents: number;
      journalEvents: number;
      totalJournalLength: number;
      topicCounts: Map<string, number>;
      events: (InternalEvent | UnifiedInternalEvent)[];
    }
  >();

  for (const ev of events) {
    // Handle both InternalEvent (eventAt is Date) and UnifiedInternalEvent (eventAt is string)
    const eventAtDate = typeof ev.eventAt === "string" ? new Date(ev.eventAt) : ev.eventAt;
    const start = startOfWeek(eventAtDate);
    const weekId = formatDateKey(start);
    const end = endOfWeek(start);

    let bucket = buckets.get(weekId);
    if (!bucket) {
      bucket = {
        startDate: start,
        endDate: end,
        totalEvents: 0,
        journalEvents: 0,
        totalJournalLength: 0,
        topicCounts: new Map(),
        events: [],
      };
      buckets.set(weekId, bucket);
    }

    bucket.totalEvents += 1;
    bucket.events.push(ev);

    // Determine if this is a UnifiedInternalEvent or legacy InternalEvent
    const isUnified = "sourceKind" in ev;

    let sourceKind: string | undefined;
    let eventKind: string | undefined;
    let topics: string[] = [];
    let length = 0;

    if (isUnified) {
      // UnifiedInternalEvent - use structured fields directly
      const unified = ev as UnifiedInternalEvent;
      sourceKind = unified.sourceKind;
      eventKind = unified.eventKind;
      topics = unified.topics ?? [];

      // Extract length from rawMetadata if present
      const rawMeta = unified.rawMetadata as Record<string, unknown> | undefined;
      if (rawMeta?.raw_metadata && typeof (rawMeta.raw_metadata as Record<string, unknown>)?.length === "number") {
        length = (rawMeta.raw_metadata as Record<string, unknown>).length as number;
      } else if (rawMeta?.length && typeof rawMeta.length === "number") {
        length = rawMeta.length as number;
      } else if (unified.details) {
        length = unified.details.length;
      }
    } else {
      // Legacy InternalEvent - interpret plaintext payload
      const internal = ev as InternalEvent;
      const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
      sourceKind = payload.source_kind as string | undefined;
      eventKind = payload.event_kind as string | undefined;

      length =
        typeof (payload?.raw_metadata as Record<string, unknown>)?.length === "number"
          ? ((payload.raw_metadata as Record<string, unknown>).length as number)
          : typeof payload?.content === "string"
          ? (payload.content as string).length
          : 0;

      topics = Array.isArray(payload?.topics)
        ? (payload.topics as unknown[]).filter((t): t is string => typeof t === "string")
        : [];
    }

    if (sourceKind === "journal" && eventKind === "written") {
      bucket.journalEvents += 1;
      bucket.totalJournalLength += length;

      for (const t of topics) {
        bucket.topicCounts.set(t, (bucket.topicCounts.get(t) ?? 0) + 1);
      }
    }
  }

  const insights: WeeklyInsight[] = [];

  for (const [weekId, bucket] of buckets.entries()) {
    // Use engine to compute artifact for this week (Phase 4.0.1)
    const artifact = computeInsightsForWindowEngine({
      horizon: 'weekly',
      events: bucket.events,
      windowStart: bucket.startDate,
      windowEnd: bucket.endDate,
    });

    // Extract data from artifact to build WeeklyInsight (backward compatibility)
    // Preserve existing logic for topics and distribution
    const avgJournalLength =
      bucket.journalEvents > 0
        ? bucket.totalJournalLength / bucket.journalEvents
        : 0;

    // Simple top topics extraction
    const topTopics = Array.from(bucket.topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    // Extract summary from artifact cards (prefer always_on_summary if available)
    let summaryText = '';
    const alwaysOnCard = artifact.cards.find(c => c.kind === 'always_on_summary') as any;
    if (alwaysOnCard?.data?.summaryType === 'writing_change' && alwaysOnCard.explanation) {
      summaryText = alwaysOnCard.explanation;
    } else {
      // Fallback to building summary from data
      summaryText = buildSummaryText({
        totalEvents: bucket.totalEvents,
        journalEvents: bucket.journalEvents,
        avgJournalLength,
        topTopics,
      });
    }

    const distribution = fitHeuristics(
      bucket.events.map((ev) => {
        const eventAt = typeof ev.eventAt === "string" ? new Date(ev.eventAt) : ev.eventAt;
        return { eventAt };
      })
    );

    insights.push({
      weekId,
      startDate: bucket.startDate,
      endDate: bucket.endDate,
      totalEvents: bucket.totalEvents,
      journalEvents: bucket.journalEvents,
      avgJournalLength,
      topGuessedTopics: topTopics,
      summaryText,
      distributionLabel: distribution.distributionLabel,
      skew: distribution.skew,
      concentrationShareTop10PercentDays: distribution.concentrationShareTop10PercentDays,
    });
  }

  // Sort newest week first
  insights.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

  return insights;
}

/**
 * @deprecated — delegates to Insight Engine (Phase 4.0)
 * Legacy helper for computing window stats.
 * This function is kept for backward compatibility but will be removed in future phases.
 * 
 * For new code, use computeInsightsForWindow from the insight engine directly.
 */
function computeWeeklyInsightsLegacy(
  events: InternalEvent[] | UnifiedInternalEvent[],
  window: TimeWindow
): {
  totalEntries: number;
  totalEvents: number;
  dominantTopics: string[];
  largestTopicDrift: {
    topic: string;
    trend: 'rising' | 'stable' | 'fading';
    change: number;
  } | null;
  mostRepeatedPhrases: Array<{ phrase: string; count: number }>;
  peakMonths: Array<{ month: string; count: number }>;
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed';
  skew: number;
  concentrationShareTop10PercentDays: number;
} {
  // Filter events to the time window
  const windowEvents = events.filter((ev) => {
    const eventAtDate = typeof ev.eventAt === "string" ? new Date(ev.eventAt) : ev.eventAt;
    return eventAtDate >= window.start && eventAtDate <= window.end;
  });

  const totalEvents = windowEvents.length;

  // Extract journal entries (reflections)
  const journalEvents: Array<{
    eventAt: Date;
    topics: string[];
    length: number;
    plaintext?: string;
  }> = [];

  const topicCounts = new Map<string, number>();

  for (const ev of windowEvents) {
    const eventAtDate = typeof ev.eventAt === "string" ? new Date(ev.eventAt) : ev.eventAt;
    
    const isUnified = "sourceKind" in ev;
    let sourceKind: string | undefined;
    let eventKind: string | undefined;
    let topics: string[] = [];
    let length = 0;
    let plaintext: string | undefined;

    if (isUnified) {
      const unified = ev as UnifiedInternalEvent;
      sourceKind = unified.sourceKind;
      eventKind = unified.eventKind;
      topics = unified.topics ?? [];
      
      const rawMeta = unified.rawMetadata as Record<string, unknown> | undefined;
      if (rawMeta?.raw_metadata && typeof (rawMeta.raw_metadata as Record<string, unknown>)?.length === "number") {
        length = (rawMeta.raw_metadata as Record<string, unknown>).length as number;
      } else if (rawMeta?.length && typeof rawMeta.length === "number") {
        length = rawMeta.length as number;
      } else if (unified.details) {
        length = unified.details.length;
        plaintext = unified.details;
      }
    } else {
      const internal = ev as InternalEvent;
      const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
      sourceKind = payload.source_kind as string | undefined;
      eventKind = payload.event_kind as string | undefined;

      length =
        typeof (payload?.raw_metadata as Record<string, unknown>)?.length === "number"
          ? ((payload.raw_metadata as Record<string, unknown>).length as number)
          : typeof payload?.content === "string"
          ? (payload.content as string).length
          : 0;

      topics = Array.isArray(payload?.topics)
        ? (payload.topics as unknown[]).filter((t): t is string => typeof t === "string")
        : [];

      if (typeof payload?.content === "string") {
        plaintext = payload.content;
      }
    }

    if (sourceKind === "journal" && eventKind === "written") {
      journalEvents.push({
        eventAt: eventAtDate,
        topics,
        length,
        plaintext,
      });

      for (const t of topics) {
        topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
      }
    }
  }

  const totalEntries = journalEvents.length;

  // Get dominant topics (top 5)
  const dominantTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  // Compute topic drift (simplified: compare first half vs second half of window)
  const midpoint = new Date(
    window.start.getTime() + (window.end.getTime() - window.start.getTime()) / 2
  );

  const firstHalfTopics = new Map<string, number>();
  const secondHalfTopics = new Map<string, number>();

  journalEvents.forEach((entry) => {
    const isFirstHalf = entry.eventAt < midpoint;
    entry.topics.forEach((topic) => {
      if (isFirstHalf) {
        firstHalfTopics.set(topic, (firstHalfTopics.get(topic) || 0) + 1);
      } else {
        secondHalfTopics.set(topic, (secondHalfTopics.get(topic) || 0) + 1);
      }
    });
  });

  // Find largest topic drift
  let largestDrift: {
    topic: string;
    trend: 'rising' | 'stable' | 'fading';
    change: number;
  } | null = null;

  const allTopics = new Set([...firstHalfTopics.keys(), ...secondHalfTopics.keys()]);
  for (const topic of allTopics) {
    const firstCount = firstHalfTopics.get(topic) || 0;
    const secondCount = secondHalfTopics.get(topic) || 0;
    const change = secondCount - firstCount;
    const absChange = Math.abs(change);

    if (!largestDrift || absChange > Math.abs(largestDrift.change)) {
      let trend: 'rising' | 'stable' | 'fading' = 'stable';
      if (change > 0) trend = 'rising';
      else if (change < 0) trend = 'fading';

      largestDrift = {
        topic,
        trend,
        change,
      };
    }
  }

  // Extract most repeated phrases (simple: 2-3 word phrases)
  const phraseCounts = new Map<string, number>();
  journalEvents.forEach((entry) => {
    if (!entry.plaintext) return;
    const words = entry.plaintext.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    
    // Extract 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    }
  });

  const mostRepeatedPhrases = Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 2) // Only phrases that appear at least twice
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  // Find peak months
  const monthCounts = new Map<string, number>();
  journalEvents.forEach((entry) => {
    const monthKey = entry.eventAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  });

  const peakMonths = Array.from(monthCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([month, count]) => ({ month, count }));

  const distribution = fitHeuristics(
    journalEvents.map((e) => ({ eventAt: e.eventAt }))
  );

  return {
    totalEntries,
    totalEvents,
    dominantTopics,
    largestTopicDrift: largestDrift,
    mostRepeatedPhrases,
    peakMonths,
    distributionLabel: distribution.distributionLabel,
    skew: distribution.skew,
    concentrationShareTop10PercentDays: distribution.concentrationShareTop10PercentDays,
  };
}

function buildSummaryText(params: {
  totalEvents: number;
  journalEvents: number;
  avgJournalLength: number;
  topTopics: string[];
}): string {
  const { totalEvents, journalEvents, avgJournalLength, topTopics } = params;

  if (totalEvents === 0) {
    return "No events recorded this week.";
  }

  const parts: string[] = [];

  parts.push(
    `This week you recorded ${totalEvents} event${totalEvents === 1 ? "" : "s"}.`
  );

  if (journalEvents > 0) {
    parts.push(
      `You wrote ${journalEvents} reflection${journalEvents === 1 ? "" : "s"} with an average length of ${Math.round(
        avgJournalLength
      )} characters.`
    );
  }

  if (topTopics.length > 0) {
    parts.push(`Your main topics appear to be ${topTopics.join(", ")}.`);
  }

  return parts.join(" ");
}

/**
 * @deprecated — Thin wrapper for backward compatibility (Phase 4.2)
 * 
 * This wrapper maintains backward compatibility for legacy callers that expect
 * the stats format. It delegates to the legacy implementation.
 * 
 * For new code, import computeInsightsForWindow directly from:
 * src/app/lib/insights/computeInsightsForWindow
 */
export function computeInsightsForWindow(
  events: InternalEvent[] | UnifiedInternalEvent[],
  window: TimeWindow
): {
  totalEntries: number;
  totalEvents: number;
  dominantTopics: string[];
  largestTopicDrift: {
    topic: string;
    trend: 'rising' | 'stable' | 'fading';
    change: number;
  } | null;
  mostRepeatedPhrases: Array<{ phrase: string; count: number }>;
  peakMonths: Array<{ month: string; count: number }>;
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed';
  skew: number;
  concentrationShareTop10PercentDays: number;
} {
  // Delegate to legacy implementation for backward compatibility
  // TODO: Phase 4.3+ - migrate callers to use engine InsightArtifact directly
  return computeWeeklyInsightsLegacy(events, window);
}

