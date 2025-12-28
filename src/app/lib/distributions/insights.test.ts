import { describe, it, expect } from 'vitest';
import { generateDistributionInsight } from './insights';
import type { DistributionSeries } from '@/app/lib/distributionTypes';
import type { DistributionShape } from './classify';

describe('generateDistributionInsight', () => {
  it('insufficient_data → null', () => {
    const series: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: [],
    };

    const result = generateDistributionInsight(series, 'insufficient_data');
    expect(result).toBeNull();
  });

  it('normal → correct headline + description', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const series: DistributionSeries = {
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

    const result = generateDistributionInsight(series, 'normal');
    
    expect(result).not.toBeNull();
    expect(result!.headline).toBe('Your activity is evenly distributed over time');
    expect(result!.description).toBe('Your reflections are spread consistently, with no single period dominating your attention. This suggests steady engagement rather than bursts or gaps.');
    expect(result!.shape).toBe('normal');
  });

  it('log_normal → correct language', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const series: DistributionSeries = {
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

    const result = generateDistributionInsight(series, 'log_normal');
    
    expect(result).not.toBeNull();
    expect(result!.headline).toBe('Your activity clusters into focused periods');
    expect(result!.description).toBe('Most of your reflections occur during a few concentrated windows, while the rest are spread lightly. This indicates cycles of focus followed by quieter periods.');
    expect(result!.shape).toBe('log_normal');
  });

  it('power_law → correct language', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
    const series: DistributionSeries = {
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
        { timestamp: baseTime + 950400000, weight: 20 },
      ],
    };

    const result = generateDistributionInsight(series, 'power_law');
    
    expect(result).not.toBeNull();
    expect(result!.headline).toBe('Your activity concentrates in intense bursts');
    expect(result!.description).toBe('A small number of time periods account for most of your reflections. This pattern suggests episodic intensity, where meaning accumulates during rare but powerful moments.');
    expect(result!.shape).toBe('power_law');
  });

  it('confidence scaling works as expected', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z').getTime();

    // Low confidence: < 20 events
    const lowConfidence: DistributionSeries = {
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
    const lowResult = generateDistributionInsight(lowConfidence, 'normal');
    expect(lowResult).not.toBeNull();
    expect(lowResult!.confidence).toBe('low');

    // Medium confidence: 20-50 events
    const mediumConfidence: DistributionSeries = {
      bucket: 'day',
      shape: 'normal',
      points: Array.from({ length: 25 }, (_, i) => ({
        timestamp: baseTime + i * 86400000,
        weight: 2,
      })),
    };
    const mediumResult = generateDistributionInsight(mediumConfidence, 'normal');
    expect(mediumResult).not.toBeNull();
    expect(mediumResult!.confidence).toBe('medium');

    // High confidence: > 50 events with clear signal
    const highConfidence: DistributionSeries = {
      bucket: 'day',
      shape: 'power_law',
      points: [
        ...Array.from({ length: 50 }, (_, i) => ({
          timestamp: baseTime + i * 86400000,
          weight: 1,
        })),
        { timestamp: baseTime + 50 * 86400000, weight: 30 }, // Strong tail
      ],
    };
    const highResult = generateDistributionInsight(highConfidence, 'power_law');
    expect(highResult).not.toBeNull();
    expect(highResult!.confidence).toBe('high');
  });
});

