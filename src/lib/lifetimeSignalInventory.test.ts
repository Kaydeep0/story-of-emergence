import { describe, it, expect } from 'vitest';
import {
  buildLifetimeSignalInventory,
  type ReflectionMeta,
  type DeterministicCandidate,
} from './lifetimeSignalInventory';

describe('buildLifetimeSignalInventory', () => {
  it('computes distinct months, first/last seen, filters missing IDs, and sorts deterministically', () => {
    const reflections: ReflectionMeta[] = [
      { id: 'r1', createdAt: '2023-01-15T10:00:00Z' },
      { id: 'r2', createdAt: '2023-02-20T14:00:00Z' },
      { id: 'r3', createdAt: '2023-03-10T09:00:00Z' },
      { id: 'r4', createdAt: '2024-01-15T10:00:00Z' },
      { id: 'r5', createdAt: '2024-02-20T14:00:00Z' },
    ];

    const candidates: DeterministicCandidate[] = [
      {
        id: 'c1',
        label: 'Word "work" appears 3 times',
        category: 'theme',
        reflectionIds: ['r1', 'r2', 'r3', 'missing-id'], // Includes missing ID
        confidence: 0.5,
      },
      {
        id: 'c2',
        label: 'Gap of 14 days',
        category: 'transition',
        reflectionIds: ['r4', 'r5'],
        confidence: 0.7, // Higher confidence
      },
      {
        id: 'c3',
        label: 'First reflection',
        category: 'anchor',
        reflectionIds: ['r1'],
        confidence: 0.3,
      },
    ];

    const result = buildLifetimeSignalInventory({ reflections, candidates });

    // Verify structure
    expect(result.totalReflections).toBe(5);
    expect(result.signals.length).toBe(3);
    expect(result.generatedAt).toBeTruthy();

    // Verify c1 (theme) - should filter out missing-id
    const c1 = result.signals.find((s) => s.id === 'c1');
    expect(c1).toBeDefined();
    expect(c1?.totalCount).toBe(3); // Only r1, r2, r3 (missing-id filtered)
    expect(c1?.reflectionIds).toEqual(['r1', 'r2', 'r3']); // Missing ID filtered
    expect(c1?.firstSeen).toBe('2023-01-15T10:00:00.000Z');
    expect(c1?.lastSeen).toBe('2023-03-10T09:00:00.000Z');
    expect(c1?.distinctMonths).toBe(3); // Jan, Feb, Mar 2023

    // Verify c2 (transition) - higher confidence
    const c2 = result.signals.find((s) => s.id === 'c2');
    expect(c2).toBeDefined();
    expect(c2?.totalCount).toBe(2);
    expect(c2?.firstSeen).toBe('2024-01-15T10:00:00.000Z');
    expect(c2?.lastSeen).toBe('2024-02-20T14:00:00.000Z');
    expect(c2?.distinctMonths).toBe(2); // Jan, Feb 2024

    // Verify c3 (anchor)
    const c3 = result.signals.find((s) => s.id === 'c3');
    expect(c3).toBeDefined();
    expect(c3?.totalCount).toBe(1);
    expect(c3?.firstSeen).toBe('2023-01-15T10:00:00.000Z');
    expect(c3?.lastSeen).toBe('2023-01-15T10:00:00.000Z');
    expect(c3?.distinctMonths).toBe(1);

    // Verify sorting: confidence desc, distinctMonths desc, totalCount desc
    expect(result.signals[0].id).toBe('c2'); // Highest confidence (0.7)
    expect(result.signals[1].id).toBe('c1'); // Medium confidence (0.5), but more distinctMonths (3) than c3
    expect(result.signals[2].id).toBe('c3'); // Lowest confidence (0.3)

    // Verify labels are untouched
    expect(c1?.label).toBe('Word "work" appears 3 times');
    expect(c2?.label).toBe('Gap of 14 days');
    expect(c3?.label).toBe('First reflection');
  });
});

