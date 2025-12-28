import { describe, it, expect } from 'vitest';
import { inspectDistribution } from './inspect';
import type { DistributionSeries } from '@/app/lib/distributionTypes';

describe('inspectDistribution', () => {
  it('empty series returns totalEvents 0, totalWeight 0, min and max null, bucketCount correct, nonEmptyBuckets 0', () => {
    const series: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [],
    };

    const stats = inspectDistribution(series);

    expect(stats.totalEvents).toBe(0);
    expect(stats.totalWeight).toBe(0);
    expect(stats.minTimestamp).toBeNull();
    expect(stats.maxTimestamp).toBeNull();
    expect(stats.bucketCount).toBe(0);
    expect(stats.nonEmptyBuckets).toBe(0);
  });

  it('single bucket with points returns correct counts, weights, min, max', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const series: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        {
          timestamp: baseTime,
          weight: 5,
        },
      ],
    };

    const stats = inspectDistribution(series);

    expect(stats.totalEvents).toBe(5);
    expect(stats.totalWeight).toBe(5);
    expect(stats.minTimestamp).toBe(baseTime);
    expect(stats.maxTimestamp).toBe(baseTime);
    expect(stats.bucketCount).toBe(1);
    expect(stats.nonEmptyBuckets).toBe(1);
  });

  it('sparse multi bucket returns correct nonEmptyBuckets and min max', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const series: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        {
          timestamp: baseTime,
          weight: 3,
        },
        {
          timestamp: baseTime + 86400000, // Next day, empty bucket (weight 0)
          weight: 0,
        },
        {
          timestamp: baseTime + 172800000, // Day 3
          weight: 2,
        },
        {
          timestamp: baseTime + 259200000, // Day 4, empty bucket (weight 0)
          weight: 0,
        },
        {
          timestamp: baseTime + 345600000, // Day 5
          weight: 4,
        },
      ],
    };

    const stats = inspectDistribution(series);

    expect(stats.totalEvents).toBe(9); // 3 + 0 + 2 + 0 + 4
    expect(stats.totalWeight).toBe(9);
    expect(stats.minTimestamp).toBe(baseTime);
    expect(stats.maxTimestamp).toBe(baseTime + 345600000);
    expect(stats.bucketCount).toBe(5);
    expect(stats.nonEmptyBuckets).toBe(3); // Only 3 buckets with weight > 0
  });

  it('dense multi bucket returns correct totals', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const series: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        {
          timestamp: baseTime,
          weight: 2,
        },
        {
          timestamp: baseTime + 86400000,
          weight: 3,
        },
        {
          timestamp: baseTime + 172800000,
          weight: 1,
        },
        {
          timestamp: baseTime + 259200000,
          weight: 4,
        },
        {
          timestamp: baseTime + 345600000,
          weight: 2,
        },
      ],
    };

    const stats = inspectDistribution(series);

    expect(stats.totalEvents).toBe(12); // 2 + 3 + 1 + 4 + 2
    expect(stats.totalWeight).toBe(12);
    expect(stats.minTimestamp).toBe(baseTime);
    expect(stats.maxTimestamp).toBe(baseTime + 345600000);
    expect(stats.bucketCount).toBe(5);
    expect(stats.nonEmptyBuckets).toBe(5); // All buckets have weight > 0
  });
});

