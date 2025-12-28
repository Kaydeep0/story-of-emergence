import type { TimeBucket, DistributionShape, DistributionSeries, DistributionPoint } from '@/app/lib/distributionTypes';
import { bucketTimestamp } from '@/app/lib/timeBuckets';

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

