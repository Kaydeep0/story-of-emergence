// src/app/lib/insights/computeYearOverYear.ts
// Compute Year over Year insights and return as InsightCard
// Integrates with existing insight engine

import type { ReflectionEntry, YearOverYearCard, InsightEvidence } from './types';
import { computeYearOverYearInsights, type YearOverYearInput, type YearInsightOutputs } from './yearOverYear';
import { computeTopicDrift } from './topicDrift';
import { computeLinkClusters } from './linkClusters';

/**
 * Generate insight ID for year over year insights
 */
function generateYearOverYearId(year1: number, year2: number): string {
  return `year_over_year_${year1}_${year2}_${Date.now()}`;
}

/**
 * Extract insight outputs from reflections for a given year
 * This prepares the data needed for year-over-year computation
 */
function extractYearInsightOutputs(
  reflections: ReflectionEntry[],
  year: number
): YearInsightOutputs {
  // Extract themes from topic drift
  const topicDrift = computeTopicDrift(reflections, new Date(year, 11, 31));
  const themes = topicDrift.map(bucket => bucket.topic);
  
  // Extract dominant topics (top 5 by frequency)
  const dominantTopics = topicDrift
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(bucket => bucket.topic);
  
  // Extract clusters
  const clusters = computeLinkClusters(reflections);
  const clusterThemes = clusters
    .flatMap(cluster => cluster.data.topTokens)
    .slice(0, 10);
  
  return {
    themes: [...new Set([...themes, ...clusterThemes])],
    dominantTopics,
    clusters: clusterThemes,
  };
}

/**
 * Compute year-over-year insights and return as InsightCard
 * Pure function - deterministic, no side effects
 * 
 * @param reflections - All reflections (will be filtered by year)
 * @param fromYear - First year to compare
 * @param toYear - Second year to compare
 * @returns YearOverYearCard or null if insufficient data
 */
export function computeYearOverYearCard(
  reflections: ReflectionEntry[],
  fromYear: number,
  toYear: number
): YearOverYearCard | null {
  // Filter reflections by year
  const reflections1 = reflections.filter(r => {
    if (r.deletedAt) return false;
    const year = new Date(r.createdAt).getFullYear();
    return year === fromYear;
  });
  
  const reflections2 = reflections.filter(r => {
    if (r.deletedAt) return false;
    const year = new Date(r.createdAt).getFullYear();
    return year === toYear;
  });
  
  // Need at least some reflections in both years
  if (reflections1.length === 0 || reflections2.length === 0) {
    return null;
  }
  
  // Extract insight outputs for each year
  const insights1 = extractYearInsightOutputs(reflections1, fromYear);
  const insights2 = extractYearInsightOutputs(reflections2, toYear);
  
  // Compute year-over-year insights
  const yearOverYearData = computeYearOverYearInsights({
    year1: fromYear,
    year2: toYear,
    reflections1,
    reflections2,
    insights1,
    insights2,
  });
  
  // Generate evidence from reflections
  const evidence: InsightEvidence[] = [
    ...reflections1.slice(0, 3).map(r => ({
      entryId: r.id,
      timestamp: r.createdAt,
      preview: r.plaintext.slice(0, 60) + '...',
    })),
    ...reflections2.slice(0, 3).map(r => ({
      entryId: r.id,
      timestamp: r.createdAt,
      preview: r.plaintext.slice(0, 60) + '...',
    })),
  ];
  
  // Build title and explanation
  const continuityCount = yearOverYearData.themeContinuities.length;
  const emergenceCount = yearOverYearData.themeEmergences.length;
  const disappearanceCount = yearOverYearData.themeDisappearances.length;
  
  const title = `${fromYear} → ${toYear}`;
  
  const explanationParts: string[] = [];
  if (continuityCount > 0) {
    explanationParts.push(`${continuityCount} theme${continuityCount === 1 ? '' : 's'} continued`);
  }
  if (emergenceCount > 0) {
    explanationParts.push(`${emergenceCount} new theme${emergenceCount === 1 ? '' : 's'} emerged`);
  }
  if (disappearanceCount > 0) {
    explanationParts.push(`${disappearanceCount} theme${disappearanceCount === 1 ? '' : 's'} faded`);
  }
  
  const explanation = explanationParts.length > 0
    ? explanationParts.join(', ') + '.'
    : `Comparison between ${fromYear} and ${toYear}.`;
  
  const card: YearOverYearCard = {
    id: generateYearOverYearId(fromYear, toYear),
    kind: 'year_over_year',
    title,
    explanation,
    evidence,
    computedAt: new Date().toISOString(),
    data: {
      fromYear,
      toYear,
      themeContinuities: yearOverYearData.themeContinuities,
      themeDisappearances: yearOverYearData.themeDisappearances,
      themeEmergences: yearOverYearData.themeEmergences,
      languageShifts: yearOverYearData.languageShifts,
      notableAbsences: yearOverYearData.notableAbsences,
    },
    derived: true,
  };
  
  return card;
}

