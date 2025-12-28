import type { DistributionSeries } from '@/app/lib/distributionTypes';

export type DistributionStats = {
  totalEvents: number;
  totalWeight: number;
  minTimestamp: number | null;
  maxTimestamp: number | null;
  bucketCount: number;
  nonEmptyBuckets: number;
};

/**
 * Inspect a distribution series and compute statistics
 * Pure function, deterministic
 * @param series Distribution series to inspect
 * @returns Statistics about the distribution
 */
export function inspectDistribution(series: DistributionSeries): DistributionStats {
  const points = series.points;
  
  // Handle empty series
  if (points.length === 0) {
    return {
      totalEvents: 0,
      totalWeight: 0,
      minTimestamp: null,
      maxTimestamp: null,
      bucketCount: 0,
      nonEmptyBuckets: 0,
    };
  }

  // Compute totals
  let totalWeight = 0;
  let minTimestamp: number | null = null;
  let maxTimestamp: number | null = null;
  let nonEmptyBuckets = 0;

  for (const point of points) {
    // Count total weight (each point represents aggregated events in a bucket)
    totalWeight += point.weight;
    
    // Track min and max timestamps
    if (minTimestamp === null || point.timestamp < minTimestamp) {
      minTimestamp = point.timestamp;
    }
    if (maxTimestamp === null || point.timestamp > maxTimestamp) {
      maxTimestamp = point.timestamp;
    }
    
    // Count non-empty buckets (buckets with weight > 0)
    if (point.weight > 0) {
      nonEmptyBuckets++;
    }
  }

  // totalEvents counts total points across all buckets
  // Each point represents aggregated events, so we use the weight as the event count
  const totalEvents = totalWeight;

  return {
    totalEvents,
    totalWeight,
    minTimestamp,
    maxTimestamp,
    bucketCount: points.length,
    nonEmptyBuckets,
  };
}

