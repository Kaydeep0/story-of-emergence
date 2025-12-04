// src/app/lib/weeklyInsights.ts

import type { InternalEvent } from "./types";
import type { UnifiedInternalEvent } from "../../lib/internalEvents";

export type WeeklyInsight = {
  weekId: string;         // e.g. "2025-12-01" for the Monday of that week
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  journalEvents: number;
  avgJournalLength: number;
  topGuessedTopics: string[];
  summaryText: string;
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
      };
      buckets.set(weekId, bucket);
    }

    bucket.totalEvents += 1;

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
    const avgJournalLength =
      bucket.journalEvents > 0
        ? bucket.totalJournalLength / bucket.journalEvents
        : 0;

    // Simple top topics extraction
    const topTopics = Array.from(bucket.topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    const summaryText = buildSummaryText({
      totalEvents: bucket.totalEvents,
      journalEvents: bucket.journalEvents,
      avgJournalLength,
      topTopics,
    });

    insights.push({
      weekId,
      startDate: bucket.startDate,
      endDate: bucket.endDate,
      totalEvents: bucket.totalEvents,
      journalEvents: bucket.journalEvents,
      avgJournalLength,
      topGuessedTopics: topTopics,
      summaryText,
    });
  }

  // Sort newest week first
  insights.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

  return insights;
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

