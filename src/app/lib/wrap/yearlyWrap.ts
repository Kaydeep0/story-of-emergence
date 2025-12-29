import type { InsightCard, InsightDeltaCard } from '@/app/lib/insights/viewModels';
import { generateSummary, generateDominantPattern } from './yearlyTemplates';

export type YearlyWrapInput = {
  yearlyInsights: InsightCard[];
  yearlyDeltas: InsightDeltaCard[];
};

export type YearlyWrap = {
  headline: string;
  summary: string;
  dominantPattern: string;
  cadenceLabel: string;
  densityLabel: string;
  keyMoments: InsightCard[];
  shifts: InsightDeltaCard[];
};

/**
 * Build a Yearly Wrap object from yearly insights and deltas
 * Pure function, deterministic ordering
 * @param input Yearly insights and deltas
 * @returns Structured Yearly Wrap object
 */
export function buildYearlyWrap(input: YearlyWrapInput): YearlyWrap {
  const { yearlyInsights, yearlyDeltas } = input;

  // Filter to only yearly scope insights
  const yearlyOnly = yearlyInsights.filter(insight => insight.scope === 'year');

  if (yearlyOnly.length === 0) {
    // Fallback for no yearly insights
    return {
      headline: 'Your year in reflection',
      summary: 'Not enough data to generate insights for this year.',
      dominantPattern: 'Insufficient data',
      cadenceLabel: '',
      densityLabel: '',
      keyMoments: [],
      shifts: yearlyDeltas.filter(delta => delta.scope === 'year'),
    };
  }

  // Sort insights by confidence: high > medium > low
  const confidenceOrder: Record<InsightCard['confidence'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const sortedInsights = [...yearlyOnly].sort((a, b) => {
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });

  // Headline: Use highest confidence insight headline
  const headline = sortedInsights[0]?.headline || 'Your year in reflection';

  // Extract density and cadence from label
  const topInsight = sortedInsights[0];
  const label = topInsight?.label || '';
  
  // Parse label to extract density and cadence
  let densityLabel = '';
  let cadenceLabel = '';
  
  if (label) {
    // Label format: "High density, steady engagement" or "Moderate activity, bursty focus"
    // Extract density (first word: low/moderate/high)
    const densityMatch = label.match(/^(low|moderate|high)/i);
    if (densityMatch) {
      densityLabel = densityMatch[1].toLowerCase();
    }
    
    // Extract cadence (sporadic/steady/bursty)
    const cadenceMatch = label.match(/(sporadic|steady|bursty)/i);
    if (cadenceMatch) {
      cadenceLabel = cadenceMatch[1].toLowerCase();
    }
  }

  // Summary: Combine narrative + density + cadence
  const narrativeSummary = topInsight?.summary || '';
  const summary = generateSummary(narrativeSummary, densityLabel, cadenceLabel);

  // Dominant pattern: Short phrase from density + cadence
  const dominantPattern = generateDominantPattern(densityLabel, cadenceLabel);

  // Key moments: Top 3 insights by confidence
  const keyMoments = sortedInsights.slice(0, 3);

  // Shifts: All yearly deltas (no filtering yet)
  const shifts = yearlyDeltas.filter(delta => delta.scope === 'year');

  return {
    headline,
    summary,
    dominantPattern,
    cadenceLabel,
    densityLabel,
    keyMoments,
    shifts,
  };
}

