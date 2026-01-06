// src/app/insights/lib/temporalComparisons.ts
// Helper functions for temporal comparisons and "ghost" data

import type { ReflectionEntry } from '../../lib/insights/types';
import { filterEventsByWindow, groupByDay } from '../../lib/insights/timeWindows';

/**
 * Compare current week to previous week
 */
export function compareToPreviousWeek(
  reflections: ReflectionEntry[],
  currentWeekStart: Date,
  currentWeekEnd: Date
): {
  previousWeekCount: number;
  currentWeekCount: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'same';
} {
  // Previous week: 7 days before current week
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(currentWeekEnd);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

  const currentWeekReflections = filterEventsByWindow(reflections, currentWeekStart, currentWeekEnd);
  const previousWeekReflections = filterEventsByWindow(reflections, previousWeekStart, previousWeekEnd);

  const currentWeekCount = currentWeekReflections.length;
  const previousWeekCount = previousWeekReflections.length;
  const change = currentWeekCount - previousWeekCount;
  const changePercent = previousWeekCount > 0 ? (change / previousWeekCount) * 100 : 0;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'same';

  return {
    previousWeekCount,
    currentWeekCount,
    change,
    changePercent,
    direction,
  };
}

/**
 * Compare current period to 30-day average
 */
export function compareTo30DayAverage(
  reflections: ReflectionEntry[],
  currentPeriodStart: Date,
  currentPeriodEnd: Date
): {
  average30DayCount: number;
  currentPeriodCount: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'same';
} {
  // 30 days before current period
  const thirtyDaysAgo = new Date(currentPeriodStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const currentPeriodReflections = filterEventsByWindow(reflections, currentPeriodStart, currentPeriodEnd);
  const previous30DaysReflections = filterEventsByWindow(reflections, thirtyDaysAgo, currentPeriodStart);

  const currentPeriodCount = currentPeriodReflections.length;
  const previous30DaysCount = previous30DaysReflections.length;
  const average30DayCount = previous30DaysCount / 30; // Average per day
  const currentPeriodDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
  const expectedCount = average30DayCount * currentPeriodDays;
  const change = currentPeriodCount - expectedCount;
  const changePercent = expectedCount > 0 ? (change / expectedCount) * 100 : 0;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'same';

  return {
    average30DayCount,
    currentPeriodCount,
    change,
    changePercent,
    direction,
  };
}

/**
 * Get previous period daily counts for ghost visualization
 */
export function getPreviousPeriodDailyCounts(
  reflections: ReflectionEntry[],
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  periodType: 'week' | 'month' | 'year'
): number[] {
  const periodDays = periodType === 'week' ? 7 : periodType === 'month' ? 30 : 365;
  
  // Previous period: same length, ending at current period start
  const previousPeriodEnd = new Date(currentPeriodStart);
  previousPeriodEnd.setMilliseconds(previousPeriodEnd.getMilliseconds() - 1);
  const previousPeriodStart = new Date(previousPeriodEnd);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

  const previousPeriodReflections = filterEventsByWindow(reflections, previousPeriodStart, previousPeriodEnd);
  const byDay = groupByDay(previousPeriodReflections);

  // Build daily counts array matching current period structure
  const dailyCounts: number[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date(previousPeriodEnd);
    date.setDate(date.getDate() - i);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dailyCounts.push(byDay.get(dateKey)?.length || 0);
  }

  return dailyCounts;
}

/**
 * Format comparison indicator text
 */
export function formatComparisonIndicator(
  direction: 'up' | 'down' | 'same',
  changePercent: number,
  comparisonType: 'lastWeek' | '30DayAverage'
): string {
  if (direction === 'same') {
    return comparisonType === 'lastWeek' ? '≈ vs last week' : '≈ vs 30-day average';
  }

  const arrow = direction === 'up' ? '↑' : '↓';
  const percent = Math.abs(changePercent).toFixed(0);
  const label = comparisonType === 'lastWeek' ? 'vs last week' : 'vs 30-day avg';
  
  return `${arrow} ${percent}% ${label}`;
}

