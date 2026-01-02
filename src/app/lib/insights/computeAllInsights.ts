// src/app/lib/insights/computeAllInsights.ts
// Unified insight computation function
// Computes all insights including optional year-over-year insights

import type { ReflectionEntry, InsightCard } from './types';
import { computeTimelineSpikes, type TimelineSpikeCard } from './timelineSpikes';
import { computeAlwaysOnSummary, type AlwaysOnSummaryCard } from './alwaysOnSummary';
import { computeLinkClusters, type LinkClusterCard } from './linkClusters';
import { computeYearOverYearCard, type YearOverYearCard } from './computeYearOverYear';

/**
 * Options for insight computation
 */
export interface InsightComputationOptions {
  fromYear?: number;
  toYear?: number;
}

/**
 * Result of insight computation
 */
export interface InsightComputationResult {
  timelineSpikes: TimelineSpikeCard[];
  alwaysOnSummary: AlwaysOnSummaryCard[];
  linkClusters: LinkClusterCard[];
  yearOverYear: YearOverYearCard | null;
  allInsights: InsightCard[];
}

/**
 * Compute all insights from reflections
 * Pure function - deterministic, no side effects
 * 
 * @param reflections - All decrypted reflection entries
 * @param options - Optional year parameters for year-over-year computation
 * @returns InsightComputationResult with all computed insights
 */
export function computeAllInsights(
  reflections: ReflectionEntry[],
  options: InsightComputationOptions = {}
): InsightComputationResult {
  // Compute standard insights
  const timelineSpikes = computeTimelineSpikes(reflections);
  const alwaysOnSummary = computeAlwaysOnSummary(reflections);
  const linkClusters = computeLinkClusters(reflections);
  
  // Compute year-over-year if both years provided
  let yearOverYear: YearOverYearCard | null = null;
  if (options.fromYear !== undefined && options.toYear !== undefined) {
    yearOverYear = computeYearOverYearCard(
      reflections,
      options.fromYear,
      options.toYear
    );
  }
  
  // Combine all insights
  const allInsights: InsightCard[] = [
    ...timelineSpikes,
    ...alwaysOnSummary,
    ...linkClusters,
  ];
  
  if (yearOverYear) {
    allInsights.push(yearOverYear);
  }
  
  return {
    timelineSpikes,
    alwaysOnSummary,
    linkClusters,
    yearOverYear,
    allInsights,
  };
}

// Re-export canonical engine entry point for convenience
// Canonical implementation is in computeInsightsForWindow.ts
export { computeInsightsForWindow } from './computeInsightsForWindow';

