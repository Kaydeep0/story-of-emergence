// src/app/lib/insights/streakCoach.ts
// Pure function to compute streak coach insights from decrypted reflections
// Detects best writing hour and generates nudge insights
// Runs entirely client-side - no network calls, no side effects

import type { ReflectionEntry, InsightEvidence } from './types';

/**
 * Configuration for streak coach
 */
const COACH_CONFIG = {
  // Minimum entries needed to detect patterns
  minEntries: 5,
  // Minimum entries at a single hour to consider it significant
  minEntriesAtHour: 3,
  // Hours to consider as distinct time periods
  hourLabels: [
    { start: 5, end: 8, label: 'early morning' },
    { start: 8, end: 12, label: 'morning' },
    { start: 12, end: 14, label: 'midday' },
    { start: 14, end: 17, label: 'afternoon' },
    { start: 17, end: 20, label: 'evening' },
    { start: 20, end: 23, label: 'night' },
    { start: 23, end: 5, label: 'late night' }, // wraps around midnight
  ] as const,
  // Maximum evidence entries to show
  maxEvidence: 5,
};

/**
 * Streak coach insight card type
 */
export type StreakCoachCard = {
  id: string;
  kind: 'streak_coach';
  title: string;
  explanation: string;
  evidence: InsightEvidence[];
  computedAt: string;
  data: StreakCoachData;
};

/**
 * Streak coach specific data
 */
export type StreakCoachData = {
  bestHour: number; // 0-23
  bestHourLabel: string; // "10 PM", "8 AM", etc.
  periodLabel: string; // "evening", "morning", etc.
  entriesAtBestHour: number;
  totalEntries: number;
  percentageAtBestHour: number;
  currentStreak: number;
  longestStreak: number;
};

/**
 * Format hour as 12-hour time with AM/PM
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Get the time period label for an hour
 */
function getPeriodLabel(hour: number): string {
  for (const period of COACH_CONFIG.hourLabels) {
    if (period.start <= period.end) {
      // Normal range (e.g., 8-12)
      if (hour >= period.start && hour < period.end) {
        return period.label;
      }
    } else {
      // Wrap-around range (e.g., 23-5)
      if (hour >= period.start || hour < period.end) {
        return period.label;
      }
    }
  }
  return 'during the day';
}

/**
 * Calculate current and longest writing streaks
 * A streak is consecutive calendar days with at least one entry
 */
function calculateStreaks(entries: ReflectionEntry[]): {
  current: number;
  longest: number;
} {
  if (entries.length === 0) return { current: 0, longest: 0 };

  // Get unique dates with entries
  const datesSet = new Set<string>();
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
    datesSet.add(dateKey);
  }

  if (datesSet.size === 0) return { current: 0, longest: 0 };

  // Sort dates
  const sortedDates = Array.from(datesSet).sort();
  
  // Calculate longest streak
  let longest = 1;
  let currentLongest = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diffDays === 1) {
      currentLongest++;
      longest = Math.max(longest, currentLongest);
    } else {
      currentLongest = 1;
    }
  }

  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  
  let current = 0;
  
  // Check if user wrote today or yesterday (streak is active)
  if (datesSet.has(today)) {
    current = 1;
    // Count backwards from today
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1);
    
    while (datesSet.has(checkDate.toISOString().slice(0, 10))) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else if (datesSet.has(yesterday)) {
    // Streak might still be active if they haven't written today yet
    current = 1;
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 2);
    
    while (datesSet.has(checkDate.toISOString().slice(0, 10))) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  return { current, longest };
}

/**
 * Analyze writing hours and find the most consistent hour
 */
function analyzeWritingHours(
  entries: ReflectionEntry[]
): { hour: number; count: number; totalEntries: number } | null {
  const hourCounts = new Array(24).fill(0);
  let totalEntries = 0;

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    const hour = date.getHours();
    hourCounts[hour]++;
    totalEntries++;
  }

  if (totalEntries < COACH_CONFIG.minEntries) {
    return null;
  }

  // Find the hour with most entries
  let bestHour = 0;
  let maxCount = 0;

  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > maxCount) {
      maxCount = hourCounts[h];
      bestHour = h;
    }
  }

  // Check if the peak is significant enough
  if (maxCount < COACH_CONFIG.minEntriesAtHour) {
    return null;
  }

  return { hour: bestHour, count: maxCount, totalEntries };
}

/**
 * Generate unique ID for streak coach insight
 */
function generateCoachId(): string {
  return `streak_coach-${Date.now()}`;
}

/**
 * Create a short preview of entry content
 */
function createPreview(plaintext: string, maxLength = 50): string {
  const cleaned = plaintext.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '…';
}

/**
 * Get entries from the best writing hour for evidence
 */
function getEvidenceForHour(
  entries: ReflectionEntry[],
  targetHour: number,
  maxEntries: number
): InsightEvidence[] {
  const matchingEntries = entries
    .filter((e) => {
      if (e.deletedAt) return false;
      const hour = new Date(e.createdAt).getHours();
      return hour === targetHour;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, maxEntries);

  return matchingEntries.map((entry) => ({
    entryId: entry.id,
    timestamp: entry.createdAt,
    preview: createPreview(entry.plaintext),
  }));
}

/**
 * Generate nudge message based on current time and best hour
 */
function generateNudge(
  bestHour: number,
  periodLabel: string,
  currentStreak: number
): string {
  const now = new Date();
  const currentHour = now.getHours();
  const bestHourLabel = formatHour(bestHour);
  
  // Calculate hours until best writing time
  let hoursUntil = bestHour - currentHour;
  if (hoursUntil < 0) hoursUntil += 24;
  
  // Different nudges based on timing
  if (hoursUntil === 0) {
    // It's the best hour right now!
    if (currentStreak > 0) {
      return `It's your peak writing time right now! You're on a ${currentStreak}-day streak. Keep it going!`;
    }
    return `It's your peak writing time right now! Perfect moment to start a reflection.`;
  }
  
  if (hoursUntil <= 2) {
    // Coming up soon
    return `Your best writing time is coming up at ${bestHourLabel}. You tend to be most consistent in the ${periodLabel}.`;
  }
  
  if (hoursUntil >= 20) {
    // Just passed
    return `You write most consistently at ${bestHourLabel}. Try writing around this time to build your streak.`;
  }
  
  // Default nudge
  if (currentStreak > 2) {
    return `You're on a ${currentStreak}-day streak! Your best writing time is ${bestHourLabel} (${periodLabel}).`;
  }
  
  return `You write most consistently at ${bestHourLabel}. Try writing tonight to start a streak!`;
}

/**
 * Compute streak coach insight from decrypted entries
 *
 * This is a PURE FUNCTION - no side effects, no network calls.
 *
 * Algorithm:
 * 1. Analyze timestamps to find best writing hour
 * 2. Calculate current and longest streaks
 * 3. Generate personalized nudge based on timing
 * 4. Return insight card with evidence
 *
 * @param entries - Array of decrypted reflection entries
 * @returns Array with single StreakCoachCard (or empty if insufficient data)
 */
export function computeStreakCoach(entries: ReflectionEntry[]): StreakCoachCard[] {
  // Filter out deleted entries
  const activeEntries = entries.filter((e) => !e.deletedAt);

  if (activeEntries.length < COACH_CONFIG.minEntries) {
    return [];
  }

  // Analyze writing hours
  const hourAnalysis = analyzeWritingHours(activeEntries);
  
  if (!hourAnalysis) {
    return [];
  }

  // Calculate streaks
  const { current: currentStreak, longest: longestStreak } =
    calculateStreaks(activeEntries);

  const { hour: bestHour, count: entriesAtBestHour, totalEntries } = hourAnalysis;
  const bestHourLabel = formatHour(bestHour);
  const periodLabel = getPeriodLabel(bestHour);
  const percentageAtBestHour = Math.round((entriesAtBestHour / totalEntries) * 100);

  // Generate title and nudge
  const title = currentStreak > 0 
    ? `${currentStreak}-day streak · Best time: ${bestHourLabel}`
    : `Your best writing time is ${bestHourLabel}`;
  
  const explanation = generateNudge(bestHour, periodLabel, currentStreak);

  // Get evidence entries from the best hour
  const evidence = getEvidenceForHour(
    activeEntries,
    bestHour,
    COACH_CONFIG.maxEvidence
  );

  const computedAt = new Date().toISOString();

  const card: StreakCoachCard = {
    id: generateCoachId(),
    kind: 'streak_coach',
    title,
    explanation,
    evidence,
    computedAt,
    data: {
      bestHour,
      bestHourLabel,
      periodLabel,
      entriesAtBestHour,
      totalEntries,
      percentageAtBestHour,
      currentStreak,
      longestStreak,
    },
  };

  return [card];
}

