// src/app/lib/insights/alwaysOnSummary.ts
// Pure function to compute always-on summary insights from decrypted reflections
// Runs entirely client-side - no network calls, no side effects

import type {
  ReflectionEntry,
  InsightEvidence,
  AlwaysOnSummaryCard,
  AlwaysOnSummaryData,
} from './types';

/**
 * Configuration for summary computation
 */
const SUMMARY_CONFIG = {
  // Number of days to analyze for the current period
  currentPeriodDays: 7,
  // Number of days to analyze for the previous period
  previousPeriodDays: 7,
  // Minimum days of history needed to compute insights
  minDaysForAnalysis: 7,
};

/**
 * Get the start of day (midnight) for a given date in local timezone
 */
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get a date key (YYYY-MM-DD) for a given date in local timezone
 */
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the day name (Monday, Tuesday, etc.) for a date
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Generate a unique ID for an insight
 */
function generateInsightId(kind: string, subType: string): string {
  return `${kind}-${subType}-${Date.now()}`;
}

/**
 * Filter entries to those within a date range (inclusive of start, exclusive of end)
 */
function getEntriesInRange(
  entries: ReflectionEntry[],
  startDate: Date,
  endDate: Date
): ReflectionEntry[] {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return entries.filter((entry) => {
    if (entry.deletedAt) return false;
    const entryTime = new Date(entry.createdAt).getTime();
    return entryTime >= startTime && entryTime < endTime;
  });
}

/**
 * Count unique days with at least one entry
 */
function countActiveDays(entries: ReflectionEntry[]): number {
  const uniqueDays = new Set<string>();
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    uniqueDays.add(getDateKey(date));
  }
  return uniqueDays.size;
}

/**
 * Get the names of days that had activity
 */
function getActiveDayNames(entries: ReflectionEntry[]): string[] {
  const dayMap = new Map<string, Date>();

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    const dateKey = getDateKey(date);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, date);
    }
  }

  // Sort by date and get day names
  const sortedDates = Array.from(dayMap.values()).sort(
    (a, b) => a.getTime() - b.getTime()
  );

  return sortedDates.map(getDayName);
}

/**
 * Get one representative entry per active day for evidence
 */
function getEvidencePerDay(entries: ReflectionEntry[], maxDays = 7): InsightEvidence[] {
  const dayMap = new Map<string, ReflectionEntry>();

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    const dateKey = getDateKey(date);
    // Keep the first entry per day
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, entry);
    }
  }

  // Sort by date (most recent first) and take up to maxDays
  const sorted = Array.from(dayMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxDays);

  return sorted.map((entry) => ({
    entryId: entry.id,
    timestamp: entry.createdAt,
  }));
}

/**
 * Compute always-on summary insights from decrypted entries
 *
 * This is a PURE FUNCTION - it has no side effects and makes no network calls.
 * All data must already be decrypted and in memory.
 *
 * Algorithm:
 * 1. Filter entries to the last 14 days
 * 2. Split into current week (0-7 days ago) and previous week (7-14 days ago)
 * 3. Compute writing change percentage between weeks
 * 4. Compute consistency (days with at least one entry in current week)
 * 5. Generate insight cards for each metric
 *
 * @param entries - Array of decrypted reflection entries
 * @param now - Reference date for "today" (useful for testing)
 * @returns Array of AlwaysOnSummaryCards
 */
export function computeAlwaysOnSummary(
  entries: ReflectionEntry[],
  now: Date = new Date()
): AlwaysOnSummaryCard[] {
  // Filter out deleted entries
  const activeEntries = entries.filter((e) => !e.deletedAt);

  if (activeEntries.length === 0) {
    return [];
  }

  // Calculate date boundaries
  const today = getStartOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today, so -6 for 7 days total

  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13); // 14 days total

  // Get entries for each period
  const currentWeekEntries = getEntriesInRange(activeEntries, sevenDaysAgo, tomorrow);
  const previousWeekEntries = getEntriesInRange(
    activeEntries,
    fourteenDaysAgo,
    sevenDaysAgo
  );

  // Count metrics
  const currentCount = currentWeekEntries.length;
  const previousCount = previousWeekEntries.length;
  const currentActiveDays = countActiveDays(currentWeekEntries);

  // Need at least some data to generate insights
  if (currentCount === 0 && previousCount === 0) {
    return [];
  }

  const cards: AlwaysOnSummaryCard[] = [];
  const computedAt = new Date().toISOString();

  // Card 1: Writing Change
  if (previousCount > 0 || currentCount > 0) {
    const percentChange =
      previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : currentCount > 0
        ? 100
        : 0;

    const direction = percentChange >= 0 ? 'up' : 'down';
    const absPercent = Math.abs(percentChange);

    let title: string;
    if (percentChange === 0) {
      title = 'Writing activity steady this week';
    } else if (previousCount === 0 && currentCount > 0) {
      title = 'Started writing this week';
    } else {
      title = `Writing activity ${direction} ${absPercent}% this week`;
    }

    let explanation: string;
    if (previousCount === 0 && currentCount > 0) {
      explanation = `You wrote ${currentCount} ${currentCount === 1 ? 'entry' : 'entries'} in the last 7 days. Keep it up!`;
    } else if (currentCount === 0 && previousCount > 0) {
      explanation = `You had ${previousCount} ${previousCount === 1 ? 'entry' : 'entries'} the week before but none in the last 7 days.`;
    } else {
      explanation = `You wrote ${currentCount} ${currentCount === 1 ? 'entry' : 'entries'} in the last 7 days versus ${previousCount} the week before.`;
    }

    // Build evidence from both weeks
    const currentEvidence = getEvidencePerDay(currentWeekEntries, 3);
    const previousEvidence = getEvidencePerDay(previousWeekEntries, 2);
    const evidence = [...currentEvidence, ...previousEvidence];

    const data: AlwaysOnSummaryData = {
      summaryType: 'writing_change',
      currentWeekEntries: currentCount,
      previousWeekEntries: previousCount,
      currentWeekActiveDays: currentActiveDays,
      percentChange,
    };

    cards.push({
      id: generateInsightId('always_on_summary', 'writing_change'),
      kind: 'always_on_summary',
      title,
      explanation,
      evidence,
      computedAt,
      data,
    });
  }

  // Card 2: Consistency (only if we have current week data)
  if (currentCount > 0) {
    const activeDayNames = getActiveDayNames(currentWeekEntries);
    const dayListFormatted =
      activeDayNames.length <= 3
        ? activeDayNames.join(', ')
        : activeDayNames.slice(0, -1).join(', ') +
          ', and ' +
          activeDayNames[activeDayNames.length - 1];

    const title = `You wrote on ${currentActiveDays} of the last 7 days`;

    let explanation: string;
    if (currentActiveDays === 7) {
      explanation = 'Perfect week! You had entries every single day.';
    } else if (currentActiveDays >= 5) {
      explanation = `Great consistency! You had entries on ${dayListFormatted}.`;
    } else if (currentActiveDays >= 3) {
      explanation = `You had entries on ${dayListFormatted}.`;
    } else {
      explanation = `You had entries on ${dayListFormatted}. Try writing more often to build a habit.`;
    }

    const evidence = getEvidencePerDay(currentWeekEntries, 7);

    const data: AlwaysOnSummaryData = {
      summaryType: 'consistency',
      currentWeekEntries: currentCount,
      previousWeekEntries: previousCount,
      currentWeekActiveDays: currentActiveDays,
      activeDayNames,
    };

    cards.push({
      id: generateInsightId('always_on_summary', 'consistency'),
      kind: 'always_on_summary',
      title,
      explanation,
      evidence,
      computedAt,
      data,
    });
  }

  return cards;
}

