import { describe, it, expect } from 'vitest';
import { reflectionsToWeightedEvents } from './events';
import type { ReflectionEntry } from '@/app/lib/insights/types';

describe('reflectionsToWeightedEvents', () => {
  it('handles empty input', () => {
    const result = reflectionsToWeightedEvents([]);
    expect(result).toEqual([]);
  });

  it('filters out bad timestamps', () => {
    const reflections: ReflectionEntry[] = [
      {
        id: '1',
        createdAt: 'invalid-date',
        plaintext: 'test',
      },
      {
        id: '2',
        createdAt: '',
        plaintext: 'test',
      },
      {
        id: '3',
        createdAt: '2024-01-15T10:00:00Z',
        plaintext: 'test',
      },
    ];

    const result = reflectionsToWeightedEvents(reflections);
    
    // Should only have the valid timestamp
    expect(result).toHaveLength(1);
    expect(result[0].ts).toBe(new Date('2024-01-15T10:00:00Z').getTime());
  });

  it('maps correct ts and default weight', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z');
    const reflections: ReflectionEntry[] = [
      {
        id: '1',
        createdAt: baseTime.toISOString(),
        plaintext: 'test 1',
      },
      {
        id: '2',
        createdAt: new Date(baseTime.getTime() + 86400000).toISOString(), // Next day
        plaintext: 'test 2',
      },
    ];

    const result = reflectionsToWeightedEvents(reflections);

    expect(result).toHaveLength(2);
    expect(result[0].ts).toBe(baseTime.getTime());
    expect(result[0].weight).toBe(1);
    expect(result[1].ts).toBe(baseTime.getTime() + 86400000);
    expect(result[1].weight).toBe(1);
  });

  it('filters out deleted reflections', () => {
    const baseTime = new Date('2024-01-15T10:00:00Z');
    const reflections: ReflectionEntry[] = [
      {
        id: '1',
        createdAt: baseTime.toISOString(),
        plaintext: 'test 1',
        deletedAt: null,
      },
      {
        id: '2',
        createdAt: new Date(baseTime.getTime() + 86400000).toISOString(),
        plaintext: 'test 2',
        deletedAt: new Date().toISOString(), // Deleted
      },
      {
        id: '3',
        createdAt: new Date(baseTime.getTime() + 172800000).toISOString(),
        plaintext: 'test 3',
        // No deletedAt
      },
    ];

    const result = reflectionsToWeightedEvents(reflections);

    // Should exclude the deleted reflection
    expect(result).toHaveLength(2);
    expect(result[0].ts).toBe(baseTime.getTime());
    expect(result[1].ts).toBe(baseTime.getTime() + 172800000);
  });

  it('handles invalid date strings gracefully', () => {
    const reflections: ReflectionEntry[] = [
      {
        id: '1',
        createdAt: 'not-a-date',
        plaintext: 'test',
      },
      {
        id: '2',
        createdAt: '2024-01-15T10:00:00Z',
        plaintext: 'test',
      },
    ];

    const result = reflectionsToWeightedEvents(reflections);

    // Should only have the valid date
    expect(result).toHaveLength(1);
    expect(result[0].ts).toBe(new Date('2024-01-15T10:00:00Z').getTime());
  });

  it('handles zero and negative timestamps', () => {
    const reflections: ReflectionEntry[] = [
      {
        id: '1',
        createdAt: new Date(0).toISOString(), // Epoch
        plaintext: 'test',
      },
      {
        id: '2',
        createdAt: new Date(-1).toISOString(), // Negative
        plaintext: 'test',
      },
      {
        id: '3',
        createdAt: '2024-01-15T10:00:00Z',
        plaintext: 'test',
      },
    ];

    const result = reflectionsToWeightedEvents(reflections);

    // Should filter out zero and negative timestamps
    expect(result).toHaveLength(1);
    expect(result[0].ts).toBe(new Date('2024-01-15T10:00:00Z').getTime());
  });
});

