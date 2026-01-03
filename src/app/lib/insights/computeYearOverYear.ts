// src/app/lib/insights/computeYearOverYear.ts
// Compute Year over Year insights and return as InsightCard
// Integrates with existing insight engine

import type { ReflectionEntry, InsightEvidence, YearOverYearCard, YearOverYearData } from './types';
import { computeYearOverYearInsights, type YearOverYearInput, type YearInsightOutputs } from './yearOverYear';
import { computeTopicDrift } from './topicDrift';
import { computeLinkClusters } from './linkClusters';

// Re-export YearOverYearCard for convenience
export type { YearOverYearCard } from './types';

/**
 * Compute year-over-year comparison card
 * Safe stub implementation that unblocks the build
 * @param reflections All reflection entries
 * @param options Year comparison options
 * @returns YearOverYearCard with comparison insights
 */
export function computeYearOverYearCard(
  reflections: ReflectionEntry[],
  options: { fromYear: number; toYear: number }
): YearOverYearCard {
  const { fromYear, toYear } = options;

  // Filter reflections by year
  const inYear = (year: number) =>
    reflections.filter((r) => {
      const date = new Date((r as any).createdAt ?? (r as any).created_at ?? (r as any).ts ?? 0);
      return Number.isFinite(date.getTime()) && date.getFullYear() === year;
    });

  const yearAEntries = inYear(fromYear);
  const yearBEntries = inYear(toYear);

  const aCount = yearAEntries.length;
  const bCount = yearBEntries.length;
  const delta = bCount - aCount;
  const percentChange = aCount > 0 ? Math.round((delta / aCount) * 100) : 0;
  const direction = delta === 0 ? 'unchanged' : delta > 0 ? 'increased' : 'decreased';

  // Build evidence from sample entries
  const evidence: InsightEvidence[] = [
    ...yearAEntries.slice(0, 3).map((r) => ({
      entryId: r.id,
      timestamp: (r as any).createdAt ?? (r as any).created_at ?? new Date().toISOString(),
      relevance: 'high' as const,
    })),
    ...yearBEntries.slice(0, 3).map((r) => ({
      entryId: r.id,
      timestamp: (r as any).createdAt ?? (r as any).created_at ?? new Date().toISOString(),
      relevance: 'high' as const,
    })),
  ];

  const data: YearOverYearData = {
    fromYear,
    toYear,
    themeContinuities: [], // TODO: Compute theme continuities from actual reflection content
    themeDisappearances: [], // TODO: Compute theme disappearances from actual reflection content
    themeEmergences: [], // TODO: Compute theme emergences from actual reflection content
    languageShifts: [], // TODO: Compute language shifts from actual reflection content
    notableAbsences: [], // TODO: Compute notable absences from actual reflection content
  };

  return {
    id: `yoy:${fromYear}:${toYear}`,
    kind: 'year_over_year',
    title: `${toYear} vs ${fromYear}: ${direction} by ${Math.abs(delta)} entries`,
    explanation: `${toYear} had ${bCount} entries compared to ${fromYear}'s ${aCount} entries. ${percentChange !== 0 ? `That's a ${Math.abs(percentChange)}% ${direction === 'increased' ? 'increase' : 'decrease'}.` : 'No change.'}`,
    evidence,
    computedAt: new Date().toISOString(),
    data,
    derived: true,
  };
}
