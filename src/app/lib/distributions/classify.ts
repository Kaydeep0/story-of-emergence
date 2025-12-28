import type { DistributionSeries } from '@/app/lib/distributionTypes';
import { inspectDistribution } from './inspect';

export type DistributionShape =
  | 'normal'
  | 'log_normal'
  | 'power_law'
  | 'insufficient_data';

/**
 * Classify the shape of a distribution series using heuristic analysis
 * Deterministic, explainable, and stable
 * @param series Distribution series to classify
 * @returns Classified shape type
 */
export function classifyDistribution(series: DistributionSeries): DistributionShape {
  const stats = inspectDistribution(series);

  // Rule 1: Insufficient data
  if (stats.totalEvents < 10) {
    return 'insufficient_data';
  }

  const points = series.points;
  if (points.length === 0) {
    return 'insufficient_data';
  }

  // Extract weights for analysis
  const weights = points.map(p => p.weight).filter(w => w > 0);
  if (weights.length === 0) {
    return 'insufficient_data';
  }

  // Compute mean weight per bucket
  const meanWeight = stats.totalWeight / weights.length;

  // Compute variance of weights
  const variance = weights.reduce((sum, w) => {
    const diff = w - meanWeight;
    return sum + (diff * diff);
  }, 0) / weights.length;

  // Compute median weight for skew indicator
  const sortedWeights = [...weights].sort((a, b) => a - b);
  const medianWeight = sortedWeights.length % 2 === 0
    ? (sortedWeights[sortedWeights.length / 2 - 1] + sortedWeights[sortedWeights.length / 2]) / 2
    : sortedWeights[Math.floor(sortedWeights.length / 2)];

  // Skew indicator: compare median vs mean
  // If median < mean, we have positive skew (right tail)
  const skewRatio = medianWeight / meanWeight;

  // Tail indicator: percentage of total weight in top 10% of buckets
  // Sort points by weight descending
  const sortedPoints = [...points].sort((a, b) => b.weight - a.weight);
  const top10PercentCount = Math.max(1, Math.ceil(sortedPoints.length * 0.1));
  const top10PercentWeight = sortedPoints
    .slice(0, top10PercentCount)
    .reduce((sum, p) => sum + p.weight, 0);
  const tailWeight = (top10PercentWeight / stats.totalWeight) * 100;

  // Heuristic classification logic

  // Power-law: extreme skew, heavy tail, few buckets dominate
  if (tailWeight > 60 && skewRatio < 0.5) {
    return 'power_law';
  }

  // Log-normal: positive skew, moderate tail
  if (tailWeight >= 30 && tailWeight <= 60 && skewRatio < 0.8) {
    return 'log_normal';
  }

  // Normal: low skew, moderate variance, light tail
  // Default case for distributions that don't fit other patterns
  return 'normal';
}

