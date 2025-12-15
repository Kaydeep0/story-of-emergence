// src/app/lib/insights/yearlyWrap.ts
// Yearly Wrap insight computation

import type { ReflectionEntry } from './types';
import { computeTopicDrift, type TopicDriftBucket } from './topicDrift';
import { fitHeuristics } from './distributions';

/**
 * Yearly Wrap data structure (structured, not prose)
 */
export type YearlyWrap = {
  year: number;
  headline: string;
  dominantThemes: string[];
  risingTopics: string[];
  fadingTopics: string[];
  keyMoments: Array<{
    date: string; // ISO date string
    summary: string;
  }>;
  // Additional stats for UI
  entryCount: number;
  activeDays: number;
  avgLengthChars: number;
  topSources: Array<{
    sourceId: string;
    count: number;
  }>;
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed';
  skew: number;
  concentrationShareTop10PercentDays: number;
};

/**
 * Topic keywords for extraction (reused from topicDrift logic)
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  focus: ['focus', 'concentrate', 'attention', 'distracted', 'productive', 'flow'],
  work: ['work', 'job', 'career', 'office', 'meeting', 'project', 'deadline', 'colleague'],
  money: ['money', 'finance', 'budget', 'savings', 'investment', 'expense', 'income', 'salary'],
  health: ['health', 'exercise', 'sleep', 'tired', 'energy', 'workout', 'meditation', 'stress'],
  relationships: ['relationship', 'friend', 'family', 'partner', 'love', 'connection', 'social'],
};

/**
 * Get the start of week (Monday) for a given date
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of week (Sunday) for a given date
 */
function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Format date key for week (YYYY-MM-DD of Monday)
 */
function formatWeekKey(date: Date): string {
  const start = startOfWeek(date);
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const day = String(start.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if text contains any of the keywords (case insensitive)
 */
function textMatchesTopic(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Extract topics from reflection plaintext using keyword matching
 */
function extractTopics(plaintext: string): string[] {
  const topics: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (textMatchesTopic(plaintext, keywords)) {
      topics.push(topic);
    }
  }
  return topics;
}

/**
 * Compute yearly wrap data for a given year
 * @param items - All reflection entries (already decrypted)
 * @param year - The year to analyze (e.g., 2024)
 * @returns YearlyWrap object with structured data
 */
export function computeYearlyWrap(items: ReflectionEntry[], year: number): YearlyWrap {
  // Filter reflections to the specified year (non-deleted only)
  const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const yearEntries = items.filter((entry) => {
    if (entry.deletedAt) return false;
    const entryDate = new Date(entry.createdAt);
    return entryDate >= yearStart && entryDate <= yearEnd;
  });

  const entryCount = yearEntries.length;

  if (entryCount === 0) {
    return {
      year,
      headline: `No reflections found for ${year}.`,
      dominantThemes: [],
      risingTopics: [],
      fadingTopics: [],
      keyMoments: [],
      entryCount: 0,
      activeDays: 0,
      avgLengthChars: 0,
      topSources: [],
    };
  }

  // Calculate active days (unique days with at least one entry)
  const activeDaysSet = new Set<string>();
  yearEntries.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    const dateKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
    activeDaysSet.add(dateKey);
  });
  const activeDays = activeDaysSet.size;

  // Calculate average length
  const totalLength = yearEntries.reduce((sum, entry) => sum + (entry.plaintext?.length || 0), 0);
  const avgLengthChars = entryCount > 0 ? Math.round(totalLength / entryCount) : 0;

  // Extract and count topics for dominant themes
  const topicCounts = new Map<string, number>();
  yearEntries.forEach((entry) => {
    const topics = extractTopics(entry.plaintext || '');
    topics.forEach((topic) => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
  });

  // Get dominant themes (top 5 by count)
  const dominantThemes = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  // Compute topic drift to get rising/fading topics
  // Use the year as the "now" date for topic drift computation
  const topicDrift = computeTopicDrift(yearEntries, yearEnd);
  const risingTopics = topicDrift
    .filter((bucket) => bucket.trend === 'rising')
    .map((bucket) => bucket.topic)
    .slice(0, 5);
  const fadingTopics = topicDrift
    .filter((bucket) => bucket.trend === 'fading')
    .map((bucket) => bucket.topic)
    .slice(0, 5);

  // Find key moments: peak months and peak weeks
  const keyMoments: Array<{ date: string; summary: string }> = [];

  // Find peak month
  const monthCounts = new Map<number, number>();
  yearEntries.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    const month = entryDate.getMonth();
    monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
  });

  if (monthCounts.size > 0) {
    const peakMonthEntry = Array.from(monthCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (peakMonthEntry) {
      const month = peakMonthEntry[0];
      const count = peakMonthEntry[1];
      const monthDate = new Date(year, month, 15); // Middle of month
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
      keyMoments.push({
        date: monthDate.toISOString(),
        summary: `Peak activity in ${monthName} with ${count} reflection${count === 1 ? '' : 's'}`,
      });
    }
  }

  // Find peak week
  const weekCounts = new Map<string, { count: number; startDate: Date }>();
  yearEntries.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    const weekKey = formatWeekKey(entryDate);
    const weekStart = startOfWeek(entryDate);
    
    if (!weekCounts.has(weekKey)) {
      weekCounts.set(weekKey, { count: 0, startDate: weekStart });
    }
    const week = weekCounts.get(weekKey)!;
    week.count += 1;
  });

  if (weekCounts.size > 0) {
    const peakWeekEntry = Array.from(weekCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)[0];
    
    if (peakWeekEntry && peakWeekEntry[1].count > 1) {
      const weekStart = peakWeekEntry[1].startDate;
      const weekEnd = endOfWeek(weekStart);
      const count = peakWeekEntry[1].count;
      keyMoments.push({
        date: weekStart.toISOString(),
        summary: `Most active week: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} with ${count} reflection${count === 1 ? '' : 's'}`,
      });
    }
  }

  // Count sources (top 3)
  const sourceCounts = new Map<string, number>();
  yearEntries.forEach((entry) => {
    if (entry.sourceId) {
      sourceCounts.set(entry.sourceId, (sourceCounts.get(entry.sourceId) || 0) + 1);
    }
  });

  const topSources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sourceId, count]) => ({ sourceId, count }));

  // Generate headline
  const headline = generateHeadline({
    year,
    entryCount,
    activeDays,
    dominantThemes,
  });

  const distribution = fitHeuristics(
    yearEntries.map((e) => ({ eventAt: e.createdAt }))
  );

  return {
    year,
    headline,
    dominantThemes,
    risingTopics,
    fadingTopics,
    keyMoments,
    entryCount,
    activeDays,
    avgLengthChars,
    topSources,
    distributionLabel: distribution.distributionLabel,
    skew: distribution.skew,
    concentrationShareTop10PercentDays: distribution.concentrationShareTop10PercentDays,
  };
}

/**
 * Generate headline for the year
 */
function generateHeadline(params: {
  year: number;
  entryCount: number;
  activeDays: number;
  dominantThemes: string[];
}): string {
  const { year, entryCount, activeDays, dominantThemes } = params;

  if (entryCount === 0) {
    return `No reflections found for ${year}.`;
  }

  const parts: string[] = [];
  parts.push(`${year}: ${entryCount} reflection${entryCount === 1 ? '' : 's'}`);

  if (activeDays > 0) {
    parts.push(`${activeDays} active day${activeDays === 1 ? '' : 's'}`);
  }

  if (dominantThemes.length > 0) {
    parts.push(`focused on ${dominantThemes.slice(0, 3).join(', ')}`);
  }

  return parts.join(' · ');
}

/**
 * Get list of years that have reflections
 */
export function getAvailableYears(items: ReflectionEntry[]): number[] {
  const yearsSet = new Set<number>();
  items.forEach((entry) => {
    if (!entry.deletedAt) {
      const entryDate = new Date(entry.createdAt);
      yearsSet.add(entryDate.getFullYear());
    }
  });
  return Array.from(yearsSet).sort((a, b) => b - a); // Newest first
}

