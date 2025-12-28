import type { TimeBucket, DistributionShape, DistributionSeries, DistributionPoint } from '@/app/lib/distributionTypes';
import { bucketTimestamp } from '@/app/lib/timeBuckets';
import { reflectionsToWeightedEvents } from './events';
import type { ReflectionEntry } from '@/app/lib/insights/types';

export type WeightedEvent = {
  timestamp: number;
  weight?: number;
};

export type BuildDistributionSeriesArgs = {
  events: WeightedEvent[];
  bucket: TimeBucket;
  shape: DistributionShape;
  tz?: string;
  minWeight?: number;
};

export function buildDistributionSeries(args: BuildDistributionSeriesArgs): DistributionSeries {
  const {
    events,
    bucket,
    shape,
    minWeight = 0,
  } = args;

  // Filter out events with invalid timestamps
  const validEvents = events.filter(event => {
    const ts = event.timestamp;
    if (!Number.isFinite(ts)) {
      return false;
    }
    
    const weight = event.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= minWeight) {
      return false;
    }
    
    return true;
  });

  // Normalize timestamps into bucket timestamps and aggregate weights
  const bucketMap = new Map<number, number>();
  
  for (const event of validEvents) {
    const bucketTs = bucketTimestamp(event.timestamp, bucket);
    const weight = event.weight ?? 1;
    
    const currentWeight = bucketMap.get(bucketTs) ?? 0;
    bucketMap.set(bucketTs, currentWeight + weight);
  }

  // Convert map to sorted array of DistributionPoint
  const points: DistributionPoint[] = Array.from(bucketMap.entries())
    .map(([timestamp, weight]) => ({
      timestamp,
      weight,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    bucket,
    shape,
    points,
  };
}

/**
 * Helper function to build a distribution series directly from reflections
 * @param reflections Array of decrypted reflection entries
 * @param bucket Time bucket for the distribution
 * @param shape Distribution shape
 * @param minWeight Optional minimum weight threshold
 * @returns DistributionSeries
 */
export function buildDistributionFromReflections(
  reflections: ReflectionEntry[],
  bucket: TimeBucket,
  shape: DistributionShape,
  minWeight?: number
): DistributionSeries {
  // Convert reflections to weighted events
  const weightedEvents = reflectionsToWeightedEvents(reflections);
  
  // Convert to format expected by buildDistributionSeries
  const events: WeightedEvent[] = weightedEvents.map(event => ({
    timestamp: event.ts,
    weight: event.weight,
  }));

  // Build the distribution series
  return buildDistributionSeries({
    events,
    bucket,
    shape,
    minWeight,
  });
}

