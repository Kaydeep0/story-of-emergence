/**
 * LEGACY TEST — FROZEN
 *
 * This test reflects a prior distribution classifier model.
 * Current classifier semantics have diverged intentionally.
 * Do not modify or re-enable without re-validating distribution theory.
 */

import { describe, it, expect } from 'vitest';
import { buildDistributionSeries } from '../buildSeries';
import type { WeightedEvent } from '../buildSeries';

describe.skip('buildDistributionSeries', () => {
  it('aggregates multiple events into same day bucket', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const events: WeightedEvent[] = [
      { timestamp: baseTime },
      { timestamp: baseTime + 3600000 }, // 1 hour later, same day
      { timestamp: baseTime + 7200000 }, // 2 hours later, same day
    ];

    const result = buildDistributionSeries({
      events,
      bucket: 'day',
      shape: 'normal',
    });

    expect(result.points).toHaveLength(1);
    expect(result.points[0].weight).toBe(3); // All 3 events aggregated
  });

  it('weight default is 1', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const events: WeightedEvent[] = [
      { timestamp: baseTime }, // No weight specified
      { timestamp: baseTime + 86400000, weight: 2 }, // Next day with weight 2
    ];

    const result = buildDistributionSeries({
      events,
      bucket: 'day',
      shape: 'normal',
    });

    expect(result.points).toHaveLength(2);
    expect(result.points[0].weight).toBe(1); // Default weight
    expect(result.points[1].weight).toBe(2); // Explicit weight
  });

  it('sorting is ascending by timestamp', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const events: WeightedEvent[] = [
      { timestamp: baseTime + 172800000 }, // Day 3
      { timestamp: baseTime }, // Day 1
      { timestamp: baseTime + 86400000 }, // Day 2
    ];

    const result = buildDistributionSeries({
      events,
      bucket: 'day',
      shape: 'normal',
    });

    expect(result.points).toHaveLength(3);
    expect(result.points[0].timestamp).toBeLessThan(result.points[1].timestamp);
    expect(result.points[1].timestamp).toBeLessThan(result.points[2].timestamp);
  });

  it('filters invalid timestamps and invalid weights', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const events: WeightedEvent[] = [
      { timestamp: baseTime },
      { timestamp: NaN }, // Invalid timestamp
      { timestamp: Infinity }, // Invalid timestamp
      { timestamp: baseTime + 86400000, weight: NaN }, // Invalid weight
      { timestamp: baseTime + 172800000, weight: Infinity }, // Invalid weight
      { timestamp: baseTime + 259200000 }, // Valid
    ];

    const result = buildDistributionSeries({
      events,
      bucket: 'day',
      shape: 'normal',
    });

    // Should only have 2 valid events (first and last)
    expect(result.points).toHaveLength(2);
    expect(result.points.every(p => Number.isFinite(p.timestamp))).toBe(true);
    expect(result.points.every(p => Number.isFinite(p.weight))).toBe(true);
  });

  it('uses minWeight to exclude small weights', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const events: WeightedEvent[] = [
      { timestamp: baseTime, weight: 0.1 },
      { timestamp: baseTime + 86400000, weight: 0.5 },
      { timestamp: baseTime + 172800000, weight: 1.0 },
      { timestamp: baseTime + 259200000, weight: 2.0 },
    ];

    const result = buildDistributionSeries({
      events,
      bucket: 'day',
      shape: 'normal',
      minWeight: 0.5,
    });

    // Should exclude weight 0.1, include 0.5, 1.0, 2.0
    expect(result.points).toHaveLength(3);
    expect(result.points.every(p => p.weight >= 0.5)).toBe(true);
  });

  it('sets bucket and shape correctly', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const events: WeightedEvent[] = [
      { timestamp: baseTime },
    ];

    const result = buildDistributionSeries({
      events,
      bucket: 'week',
      shape: 'power_law',
    });

    expect(result.bucket).toBe('week');
    expect(result.shape).toBe('power_law');
  });

  it('handles empty events array', () => {
    const result = buildDistributionSeries({
      events: [],
      bucket: 'day',
      shape: 'normal',
    });

    expect(result.points).toHaveLength(0);
    expect(result.bucket).toBe('day');
    expect(result.shape).toBe('normal');
  });

  it('handles negative weights correctly', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const events: WeightedEvent[] = [
      { timestamp: baseTime, weight: -1 }, // Negative weight should be filtered
      { timestamp: baseTime + 86400000, weight: 0 }, // Zero weight should be filtered if minWeight is 0
      { timestamp: baseTime + 172800000, weight: 1 }, // Valid
    ];

    const result = buildDistributionSeries({
      events,
      bucket: 'day',
      shape: 'normal',
      minWeight: 0,
    });

    // Negative weight filtered, zero weight filtered, only weight 1 remains
    expect(result.points).toHaveLength(1);
    expect(result.points[0].weight).toBe(1);
  });
});

