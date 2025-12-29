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
 * Determine if a continuity observation should be rendered
 * Applies silence rules to continuity notes
 */
function shouldRenderContinuityNote(
  currentKeywords: string[],
  priorKeywords: string[],
  overlapping: string[]
): boolean {
  // Rule 1: Observation appears in only one period total
  // Continuity requires at least 2 periods (current + prior)
  if (currentKeywords.length === 0 || priorKeywords.length === 0) {
    return false;
  }

  // Rule 2: Observation frequency is below minimum threshold
  // Need at least 2 overlapping keywords for meaningful continuity
  if (overlapping.length < 2) {
    return false;
  }

  // Rule 3: Observation is ambiguous between multiple clusters
  // If keywords are too generic or common, silence
  const genericKeywords = new Set(['reflection', 'activity', 'pattern', 'engagement', 'rhythm']);
  const hasOnlyGeneric = overlapping.every(kw => genericKeywords.has(kw.toLowerCase()));
  if (hasOnlyGeneric && overlapping.length <= 2) {
    return false;
  }

  // Rule 4: Observation would require interpretation to explain
  // If overlap is very small relative to total keywords, it's ambiguous
  const overlapRatio = overlapping.length / Math.max(currentKeywords.length, priorKeywords.length);
  if (overlapRatio < 0.2) {
    return false;
  }

  return true;
}

/**
 * Generate continuity note by comparing current year's summary with prior year's summary
 * Observational only - no interpretation, no causality claims, no future language
 * Max 2 sentences
 * Only references prior yearly wrap summaries, never individual reflections or dates
 * Applies silence rules - only renders if shouldRenderContinuityNote returns true
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

  // Check if observation should be rendered (silence rules)
  if (!shouldRenderContinuityNote(currentKeywords, priorKeywords, overlapping)) {
    return null; // Silence - render nothing, no fallback language
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
  const cadence = classifyCadence(bucketCounts);
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

