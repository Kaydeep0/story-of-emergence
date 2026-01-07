// src/app/lib/insights/timelineEvents.ts
// Timeline Events - Discrete moments in time, not continuous curves
// Humans experience time as events, not graphs

import type { ReflectionEntry, InsightCard, InsightEvidence } from './types';

/**
 * Timeline Event Types
 * Each event represents a discrete moment or transition in the user's reflection pattern
 */
export type TimelineEventType =
  | 'first_occurrence'      // First time something happened
  | 'last_occurrence'        // Last time something happened (before it stopped)
  | 'after_this_never_again' // Moment after which a pattern permanently changed
  | 'pace_shift'            // Significant change in writing frequency
  | 'silence_as_signal';    // Meaningful gap that precedes or follows intensity

/**
 * Timeline Event Schema
 * Each event is a falsifiable claim about a specific moment in time
 */
export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  date: string; // ISO date string
  claim: string; // Falsifiable claim about this moment
  evidence: InsightEvidence[]; // 2-4 concrete observations
  contrast: string; // What didn't happen
  confidence: string; // Why we're confident about this event
  // Optional context for rendering
  beforeContext?: {
    date: string;
    description: string;
  };
  afterContext?: {
    date: string;
    description: string;
  };
};

/**
 * Detect timeline events from reflection entries
 * Returns 3-5 most significant events
 */
export function detectTimelineEvents(entries: ReflectionEntry[]): TimelineEvent[] {
  const activeEntries = entries.filter(e => !e.deletedAt);
  
  if (activeEntries.length < 10) {
    return []; // Need minimum data to detect meaningful events
  }

  const events: TimelineEvent[] = [];
  
  // Sort entries by date (oldest first)
  const sortedEntries = [...activeEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 1. Detect FIRST OCCURRENCE: First reflection ever
  if (sortedEntries.length > 0) {
    const firstEntry = sortedEntries[0];
    const firstDate = new Date(firstEntry.createdAt);
    
    events.push({
      id: `first-occurrence-${firstDate.toISOString()}`,
      type: 'first_occurrence',
      date: firstEntry.createdAt,
      claim: "This was your first reflection.",
      evidence: [
        {
          entryId: firstEntry.id,
          timestamp: firstEntry.createdAt,
          preview: firstEntry.plaintext.slice(0, 50) + '...',
        },
      ],
      contrast: "No reflections existed before this moment.",
      confidence: `First entry in ${sortedEntries.length} total reflections.`,
    });
  }

  // 2. Detect PACE SHIFTS: Significant changes in writing frequency
  const paceShifts = detectPaceShifts(sortedEntries);
  events.push(...paceShifts);

  // 3. Detect SILENCE AS SIGNAL: Meaningful gaps that precede/follow intensity
  const silences = detectSilenceEvents(sortedEntries);
  events.push(...silences);

  // 4. Detect LAST OCCURRENCE: Most recent reflection (if there's been a gap)
  const lastEntry = sortedEntries[sortedEntries.length - 1];
  const daysSinceLast = Math.floor(
    (Date.now() - new Date(lastEntry.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLast > 7) {
    events.push({
      id: `last-occurrence-${lastEntry.createdAt}`,
      type: 'last_occurrence',
      date: lastEntry.createdAt,
      claim: `This was your last reflection, ${daysSinceLast} days ago.`,
      evidence: [
        {
          entryId: lastEntry.id,
          timestamp: lastEntry.createdAt,
          preview: lastEntry.plaintext.slice(0, 50) + '...',
        },
      ],
      contrast: `No reflections have occurred in the ${daysSinceLast} days since.`,
      confidence: `Most recent entry in ${sortedEntries.length} total reflections.`,
    });
  }

  // Sort events by date (most recent first) and return top 5
  return events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

/**
 * Detect pace shifts: moments where writing frequency changed significantly
 */
function detectPaceShifts(entries: ReflectionEntry[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  if (entries.length < 20) {
    return []; // Need enough data to detect shifts
  }

  // Group entries by week
  const entriesByWeek = new Map<string, ReflectionEntry[]>();
  
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!entriesByWeek.has(weekKey)) {
      entriesByWeek.set(weekKey, []);
    }
    entriesByWeek.get(weekKey)!.push(entry);
  }

  const weeks = Array.from(entriesByWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekKey, weekEntries]) => ({
      weekKey,
      weekStart: new Date(weekKey),
      count: weekEntries.length,
      entries: weekEntries,
    }));

  // Look for significant shifts (2x increase or decrease)
  for (let i = 1; i < weeks.length; i++) {
    const prevWeek = weeks[i - 1];
    const currWeek = weeks[i];
    
    if (prevWeek.count === 0 || currWeek.count === 0) continue;
    
    const ratio = currWeek.count / prevWeek.count;
    const isDoubling = ratio >= 2.0;
    const isHalving = ratio <= 0.5;
    
    if (isDoubling || isHalving) {
      const shiftType = isDoubling ? 'doubled' : 'halved';
      const firstEntryOfShift = currWeek.entries[0];
      
      // Calculate before/after context
      const beforeAvg = prevWeek.count;
      const afterAvg = currWeek.count;
      
      events.push({
        id: `pace-shift-${currWeek.weekKey}`,
        type: 'pace_shift',
        date: firstEntryOfShift.createdAt,
        claim: `After this week, your writing frequency ${shiftType}.`,
        evidence: [
          {
            entryId: firstEntryOfShift.id,
            timestamp: firstEntryOfShift.createdAt,
            preview: firstEntryOfShift.plaintext.slice(0, 50) + '...',
          },
          {
            entryId: `week-${prevWeek.weekKey}`,
            timestamp: prevWeek.weekStart.toISOString(),
            preview: `Previous week: ${beforeAvg} entries`,
          },
          {
            entryId: `week-${currWeek.weekKey}`,
            timestamp: currWeek.weekStart.toISOString(),
            preview: `This week: ${afterAvg} entries`,
          },
        ],
        contrast: `A steady cadence was not maintained. Frequency ${shiftType} instead.`,
        confidence: `Pattern observed across ${weeks.length} weeks with measurable ratio of ${ratio.toFixed(1)}x.`,
        beforeContext: {
          date: prevWeek.weekStart.toISOString(),
          description: `${beforeAvg} entries/week`,
        },
        afterContext: {
          date: currWeek.weekStart.toISOString(),
          description: `${afterAvg} entries/week`,
        },
      });
    }
  }

  return events.slice(0, 2); // Return max 2 pace shifts
}

/**
 * Detect silence events: meaningful gaps that precede or follow intensity
 */
function detectSilenceEvents(entries: ReflectionEntry[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  if (entries.length < 15) {
    return [];
  }

  // Calculate gaps between consecutive entries
  const gaps: Array<{
    days: number;
    beforeEntry: ReflectionEntry;
    afterEntry: ReflectionEntry;
    beforeDate: Date;
    afterDate: Date;
  }> = [];

  for (let i = 1; i < entries.length; i++) {
    const before = entries[i - 1];
    const after = entries[i];
    const beforeDate = new Date(before.createdAt);
    const afterDate = new Date(after.createdAt);
    const days = Math.floor((afterDate.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days >= 7) { // Only consider gaps of 7+ days
      gaps.push({
        days,
        beforeEntry: before,
        afterEntry: after,
        beforeDate,
        afterDate,
      });
    }
  }

  // Find the longest gap
  if (gaps.length > 0) {
    const longestGap = gaps.reduce((max, gap) => gap.days > max.days ? gap : max);
    
    // Check if the gap precedes or follows intensity
    const beforeGap = entries.filter(
      e => new Date(e.createdAt) < longestGap.beforeDate
    );
    const afterGap = entries.filter(
      e => new Date(e.createdAt) > longestGap.afterDate
    );
    
    // Calculate intensity (entries per day) before and after
    // Look at 30-day windows before and after the gap
    const beforeWindowStart = new Date(longestGap.beforeDate);
    beforeWindowStart.setDate(beforeWindowStart.getDate() - 30);
    const afterWindowEnd = new Date(longestGap.afterDate);
    afterWindowEnd.setDate(afterWindowEnd.getDate() + 30);
    
    const beforeWindow = beforeGap.filter(
      e => new Date(e.createdAt) >= beforeWindowStart
    );
    const afterWindow = afterGap.filter(
      e => new Date(e.createdAt) <= afterWindowEnd
    );
    
    const beforeIntensity = beforeWindow.length / 30; // entries per day
    const afterIntensity = afterWindow.length / 30; // entries per day
    
    const precedesIntensity = afterIntensity > beforeIntensity * 1.5;
    const followsIntensity = beforeIntensity > afterIntensity * 1.5;
    
    if (precedesIntensity || followsIntensity) {
      const claim = precedesIntensity
        ? `This ${longestGap.days}-day silence precedes your most intense cluster.`
        : `This ${longestGap.days}-day silence follows a period of high intensity.`;
      
      events.push({
        id: `silence-${longestGap.beforeDate.toISOString()}`,
        type: 'silence_as_signal',
        date: longestGap.beforeDate.toISOString(),
        claim,
        evidence: [
          {
            entryId: longestGap.beforeEntry.id,
            timestamp: longestGap.beforeEntry.createdAt,
            preview: `Last entry before gap: ${longestGap.beforeEntry.plaintext.slice(0, 50)}...`,
          },
          {
            entryId: longestGap.afterEntry.id,
            timestamp: longestGap.afterEntry.createdAt,
            preview: `First entry after gap: ${longestGap.afterEntry.plaintext.slice(0, 50)}...`,
          },
          {
            entryId: `gap-${longestGap.days}`,
            timestamp: longestGap.beforeDate.toISOString(),
            preview: `${longestGap.days} days of silence`,
          },
        ],
        contrast: "A steady cadence was not maintained during this period.",
        confidence: `Gap of ${longestGap.days} days observed between ${beforeWindow.length} entries (before) and ${afterWindow.length} entries (after) in 30-day windows.`,
        beforeContext: {
          date: longestGap.beforeEntry.createdAt,
          description: `${beforeWindow.length} entries in 30 days before`,
        },
        afterContext: {
          date: longestGap.afterEntry.createdAt,
          description: `${afterWindow.length} entries in 30 days after`,
        },
      });
    }
  }

  return events.slice(0, 1); // Return max 1 silence event
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Convert TimelineEvent to InsightCard for rendering
 */
export function timelineEventToCard(event: TimelineEvent): InsightCard {
  return {
    id: event.id,
    kind: 'timeline_spike', // Reuse existing kind for now
    title: event.claim,
    explanation: `${event.claim}\n\nEvidence:\n${event.evidence.map(e => `• ${e.preview || e.timestamp}`).join('\n')}\n\nContrast: ${event.contrast}\n\nConfidence: ${event.confidence}`,
    evidence: event.evidence,
    computedAt: new Date().toISOString(),
  };
}

