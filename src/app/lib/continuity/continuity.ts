import type { YearlyWrap } from '../wrap/yearlyWrap';
import type { ReflectionEntry } from '../insights/types';
import { buildYearlyWrap } from '../wrap/yearlyWrap';
import { buildDistributionFromReflections } from '../distributions/buildSeries';
import { classifyDistribution } from '../distributions/classify';
import { generateDistributionInsight } from '../distributions/insights';
import { generateNarrative } from '../distributions/narratives';
import { inspectDistribution } from '../distributions/inspect';
import { fromNarrative } from '../insights/viewModels';
import { calculateDensity } from '../insights/density';
import { classifyCadence } from '../insights/cadence';
import { generateInsightLabel } from '../insights/labels';

export type ContinuityNote = {
  text: string;
};

/**
 * Generate continuity note by comparing current year's summary with prior year's summary
 * Observational only - no interpretation, no causality claims, no future language
 * Max 2 sentences
 * Only references prior yearly wrap summaries, never individual reflections or dates
 */
export function generateYearlyContinuity(
  currentYear: YearlyWrap,
  priorYear: YearlyWrap | null
): ContinuityNote | null {
  if (!priorYear) {
    return null;
  }

  // Extract keywords from summaries (simple word matching)
  // Only uses summary text, never individual reflections or dates
  const currentKeywords = extractKeywords(currentYear.summary);
  const priorKeywords = extractKeywords(priorYear.summary);

  // Find overlapping themes
  const overlapping = currentKeywords.filter(kw => priorKeywords.includes(kw));

  if (overlapping.length === 0) {
    return null;
  }

  // Generate observational note about overlapping themes
  // Max 2 sentences, no interpretation, no causality claims
  const themes = overlapping.slice(0, 2).join(' and ');
  const note = `Similar themes appeared earlier this year around ${themes}.`;

  return { text: note };
}

/**
 * Build prior year's YearlyWrap from reflections
 * Used for continuity comparison
 */
export function buildPriorYearWrap(
  reflections: ReflectionEntry[],
  priorYear: number
): YearlyWrap | null {
  // Filter reflections to prior year
  const yearStart = new Date(priorYear, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(priorYear, 11, 31, 23, 59, 59, 999);

  const priorYearEntries = reflections.filter(entry => {
    if (entry.deletedAt) return false;
    const entryDate = new Date(entry.createdAt);
    return entryDate >= yearStart && entryDate <= yearEnd;
  });

  if (priorYearEntries.length === 0) {
    return null;
  }

  // Build yearly distribution series
  const series = buildDistributionFromReflections(priorYearEntries, 'month', 'normal');
  const shape = classifyDistribution(series);

  if (shape === 'insufficient_data') {
    return null;
  }

  const classifiedSeries = { ...series, shape };
  const insight = generateDistributionInsight(classifiedSeries, shape);

  if (!insight) {
    return null;
  }

  const stats = inspectDistribution(classifiedSeries);
  const narrative = generateNarrative('year', insight);

  // Generate density and cadence label
  const bucketCounts = classifiedSeries.points.map(p => p.weight);
  const density = calculateDensity({ totalEvents: stats.totalEvents, scope: 'year' });
  const cadence = classifyCadence({ bucketCounts });
  const label = generateInsightLabel({ totalEvents: stats.totalEvents, scope: 'year', bucketCounts });

  const card = fromNarrative(narrative, label);

  // Build yearly wrap
  const yearlyWrap = buildYearlyWrap({
    yearlyInsights: [card],
    yearlyDeltas: [],
  });

  return yearlyWrap;
}

/**
 * Extract keywords from text (simple approach - common meaningful words)
 * Only references summary text, never individual reflections or dates
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'your', 'my', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom',
    'where', 'when', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not',
    'more', 'most', 'less', 'least', 'many', 'much', 'few', 'little', 'very', 'too',
    'so', 'than', 'then', 'there', 'here', 'now', 'then', 'just', 'only', 'also',
    'year', 'years', 'yearly', 'month', 'months', 'monthly', 'week', 'weeks', 'weekly',
    'day', 'days', 'daily', 'time', 'times', 'period', 'periods',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency and return top keywords
  const counts = new Map<string, number>();
  words.forEach(word => {
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

