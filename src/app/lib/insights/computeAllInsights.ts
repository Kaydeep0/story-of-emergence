// src/app/lib/insights/computeAllInsights.ts
// Unified insight computation function
// Phase 4.0: Routes through canonical engine

import type { ReflectionEntry, InsightCard } from './types';
import type { TimelineSpikeCard, AlwaysOnSummaryCard, LinkClusterCard } from './types';
import { computeYearOverYearCard, type YearOverYearCard } from './computeYearOverYear';
import { computeTimelineInsights, computeSummaryInsights } from '../insightEngine';

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
 * Phase 4.0: Routes through canonical engine
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
  // Phase 4.0: Compute insights through canonical engine
  const timelineResult = computeTimelineInsights(reflections);
  const summaryResult = computeSummaryInsights(reflections);
  
  // Compute year-over-year if both years provided (not yet in engine)
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
    ...timelineResult.spikes,
    ...summaryResult.alwaysOnSummary,
    ...timelineResult.clusters,
  ];
  
  if (yearOverYear) {
    allInsights.push(yearOverYear);
  }
  
  return {
    timelineSpikes: timelineResult.spikes,
    alwaysOnSummary: summaryResult.alwaysOnSummary,
    linkClusters: timelineResult.clusters,
    yearOverYear,
    allInsights,
  };
}

// Re-export canonical engine entry point for convenience
// Canonical implementation is in computeInsightsForWindow.ts
export { computeInsightsForWindow } from './computeInsightsForWindow';

