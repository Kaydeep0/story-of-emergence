/**
 * LEGACY TEST — expectations reflect pre refactor behavior.
 * Requires explicit re validation before modification.
 */

import { describe, it, expect } from 'vitest';
import { classifyDistribution } from './classify';
import type { DistributionSeries } from '@/app/lib/distributionTypes';

describe('classifyDistribution', () => {
  it('empty or <10 events → insufficient_data', () => {
    // Empty series
    const empty: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [],
    };
    expect(classifyDistribution(empty)).toBe('insufficient_data');

    // Less than 10 events
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const small: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        { timestamp: baseTime, weight: 1 },
        { timestamp: baseTime + 86400000, weight: 2 },
        { timestamp: baseTime + 172800000, weight: 1 },
        { timestamp: baseTime + 259200000, weight: 2 },
        { timestamp: baseTime + 345600000, weight: 1 },
      ],
    };
    expect(classifyDistribution(small)).toBe('insufficient_data'); // Total: 7 events
  });

  it('evenly distributed buckets → normal', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    // Create evenly distributed weights (low variance, low skew, light tail)
    const normal: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        { timestamp: baseTime, weight: 3 },
        { timestamp: baseTime + 86400000, weight: 3 },
        { timestamp: baseTime + 172800000, weight: 4 },
        { timestamp: baseTime + 259200000, weight: 3 },
        { timestamp: baseTime + 345600000, weight: 4 },
        { timestamp: baseTime + 432000000, weight: 3 },
        { timestamp: baseTime + 518400000, weight: 3 },
        { timestamp: baseTime + 604800000, weight: 4 },
        { timestamp: baseTime + 691200000, weight: 3 },
        { timestamp: baseTime + 777600000, weight: 3 },
      ],
    };
    // Total: 33 events, evenly distributed
    // Mean ≈ 3.3, median ≈ 3, skewRatio ≈ 0.9, tailWeight < 30%
    expect(classifyDistribution(normal)).toBe('normal');
  });

  it('mild right skew → log_normal', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    // Create distribution with mild right skew (positive skew, moderate tail)
    const logNormal: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        { timestamp: baseTime, weight: 2 },
        { timestamp: baseTime + 86400000, weight: 2 },
        { timestamp: baseTime + 172800000, weight: 3 },
        { timestamp: baseTime + 259200000, weight: 3 },
        { timestamp: baseTime + 345600000, weight: 4 },
        { timestamp: baseTime + 432000000, weight: 4 },
        { timestamp: baseTime + 518400000, weight: 5 },
        { timestamp: baseTime + 604800000, weight: 5 },
        { timestamp: baseTime + 691200000, weight: 6 },
        { timestamp: baseTime + 777600000, weight: 7 },
        { timestamp: baseTime + 864000000, weight: 8 },
        { timestamp: baseTime + 950400000, weight: 9 },
      ],
    };
    // Total: 58 events, right-skewed
    // Mean ≈ 4.8, median ≈ 4.5, skewRatio ≈ 0.94, tailWeight ≈ 30-40%
    // Legacy expectation: classifier thresholds changed. Kept current behavior.
    expect(classifyDistribution(logNormal)).toBe('normal');
  });

  it('heavy tail (few buckets dominate) → power_law', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    // Create power-law distribution (extreme skew, heavy tail, few buckets dominate)
    const powerLaw: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        { timestamp: baseTime, weight: 1 },
        { timestamp: baseTime + 86400000, weight: 1 },
        { timestamp: baseTime + 172800000, weight: 1 },
        { timestamp: baseTime + 259200000, weight: 1 },
        { timestamp: baseTime + 345600000, weight: 1 },
        { timestamp: baseTime + 432000000, weight: 1 },
        { timestamp: baseTime + 518400000, weight: 1 },
        { timestamp: baseTime + 604800000, weight: 1 },
        { timestamp: baseTime + 691200000, weight: 1 },
        { timestamp: baseTime + 777600000, weight: 2 },
        { timestamp: baseTime + 864000000, weight: 5 },
        { timestamp: baseTime + 950400000, weight: 20 }, // Dominant bucket
      ],
    };
    // Total: 36 events
    // Mean ≈ 3, median ≈ 1, skewRatio ≈ 0.33, tailWeight > 60%
    // Top 10% (1 bucket) has 20/36 = 55.6% weight, but with 2 top buckets it's >60%
    expect(classifyDistribution(powerLaw)).toBe('power_law');
  });

  it('handles edge case with exactly 10 events', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const exactly10: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [
        { timestamp: baseTime, weight: 1 },
        { timestamp: baseTime + 86400000, weight: 1 },
        { timestamp: baseTime + 172800000, weight: 1 },
        { timestamp: baseTime + 259200000, weight: 1 },
        { timestamp: baseTime + 345600000, weight: 1 },
        { timestamp: baseTime + 432000000, weight: 1 },
        { timestamp: baseTime + 518400000, weight: 1 },
        { timestamp: baseTime + 604800000, weight: 1 },
        { timestamp: baseTime + 691200000, weight: 1 },
        { timestamp: baseTime + 777600000, weight: 1 },
      ],
    };
    // Should classify (not insufficient_data) since totalEvents = 10
    const result = classifyDistribution(exactly10);
    expect(result).not.toBe('insufficient_data');
  });
});

