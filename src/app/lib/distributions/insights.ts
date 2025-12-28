import type { DistributionSeries } from '@/app/lib/distributionTypes';
import type { DistributionShape } from './classify';
import { inspectDistribution } from './inspect';

export type DistributionInsight = {
  headline: string;
  description: string;
  shape: DistributionShape;
  confidence: 'low' | 'medium' | 'high';
};

/**
 * Generate human-readable insight language from a distribution series
 * Pure function, deterministic
 * @param series Distribution series to analyze
 * @param shape Classified shape of the distribution
 * @returns Insight object with headline, description, shape, and confidence, or null if insufficient data
 */
export function generateDistributionInsight(
  series: DistributionSeries,
  shape: DistributionShape
): DistributionInsight | null {
  // Rule 1: Insufficient data returns null
  if (shape === 'insufficient_data') {
    return null;
  }

  const stats = inspectDistribution(series);
  const points = series.points;

  // Calculate confidence based on totalEvents, skew, and tailWeight
  const confidence = calculateConfidence(series, stats);

  // Generate language based on shape
  switch (shape) {
    case 'normal': {
      return {
        headline: 'Your activity is evenly distributed over time',
        description: 'Your reflections are spread consistently, with no single period dominating your attention. This suggests steady engagement rather than bursts or gaps.',
        shape: 'normal',
        confidence,
      };
    }

    case 'log_normal': {
      return {
        headline: 'Your activity clusters into focused periods',
        description: 'Most of your reflections occur during a few concentrated windows, while the rest are spread lightly. This indicates cycles of focus followed by quieter periods.',
        shape: 'log_normal',
        confidence,
      };
    }

    case 'power_law': {
      return {
        headline: 'Your activity concentrates in intense bursts',
        description: 'A small number of time periods account for most of your reflections. This pattern suggests episodic intensity, where meaning accumulates during rare but powerful moments.',
        shape: 'power_law',
        confidence,
      };
    }

    default: {
      // Fallback for any unexpected shape (shouldn't happen, but TypeScript requires exhaustiveness)
      return null;
    }
  }
}

/**
 * Calculate confidence level based on totalEvents, skew strength, and tailWeight
 * Pure function, deterministic
 */
function calculateConfidence(series: DistributionSeries, stats: ReturnType<typeof inspectDistribution>): 'low' | 'medium' | 'high' {
  // High confidence: totalEvents > 50 AND clear shape signal
  if (stats.totalEvents > 50) {
    // Check for clear shape signal by computing skew and tailWeight
    const points = series.points;
    const weights = points.map(p => p.weight).filter(w => w > 0);
    
    if (weights.length === 0) {
      return 'low';
    }

    const meanWeight = stats.totalWeight / weights.length;
    const sortedWeights = [...weights].sort((a, b) => a - b);
    const medianWeight = sortedWeights.length % 2 === 0
      ? (sortedWeights[sortedWeights.length / 2 - 1] + sortedWeights[sortedWeights.length / 2]) / 2
      : sortedWeights[Math.floor(sortedWeights.length / 2)];
    
    const skewRatio = medianWeight / meanWeight;
    
    // Calculate tailWeight
    const sortedPoints = [...points].sort((a, b) => b.weight - a.weight);
    const top10PercentCount = Math.max(1, Math.ceil(sortedPoints.length * 0.1));
    const top10PercentWeight = sortedPoints
      .slice(0, top10PercentCount)
      .reduce((sum, p) => sum + p.weight, 0);
    const tailWeight = (top10PercentWeight / stats.totalWeight) * 100;

    // Clear signal: strong skew (skewRatio < 0.7) OR strong tail (tailWeight > 40%)
    const hasClearSignal = skewRatio < 0.7 || tailWeight > 40;
    
    if (hasClearSignal) {
      return 'high';
    }
  }

  // Medium confidence: totalEvents 20-50
  if (stats.totalEvents >= 20 && stats.totalEvents <= 50) {
    return 'medium';
  }

  // Low confidence: otherwise
  return 'low';
}

