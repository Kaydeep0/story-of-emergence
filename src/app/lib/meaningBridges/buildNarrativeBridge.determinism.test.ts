// src/app/lib/meaningBridges/buildNarrativeBridge.determinism.test.ts
// Invariant Hardening Phase: Determinism regression test
// Proves that identical inputs produce identical outputs for bridge generation

import { describe, it, expect } from 'vitest';
import { buildNarrativeBridges } from './buildNarrativeBridge';
import type { NarrativeBridge } from './buildNarrativeBridge';

/**
 * Create a test reflection with deterministic data
 */
function createTestReflection(
  id: string,
  createdAt: string,
  text: string
): { id: string; createdAt: string; text: string } {
  return {
    id,
    createdAt,
    text,
  };
}

describe('buildNarrativeBridges determinism', () => {
  it('produces identical output for identical input when run twice', () => {
    // Create a fixed set of reflections with deterministic data
    const reflections = [
      createTestReflection(
        'ref-1',
        '2024-01-01T10:00:00Z',
        'This is a reflection about scale and magnitude. I am thinking about orders of magnitude and system level changes.'
      ),
      createTestReflection(
        'ref-2',
        '2024-01-02T10:00:00Z',
        'Building on the previous thought, I see how trust and coordination matter at the institutional level. This connects to central bank policy.'
      ),
      createTestReflection(
        'ref-3',
        '2024-01-03T10:00:00Z',
        'I watched a documentary about economic systems. This show made me think differently about structural changes.'
      ),
      createTestReflection(
        'ref-4',
        '2024-01-04T10:00:00Z',
        'Zoomed out perspective: I used to think local changes were enough, but actually systemic shifts are required. This is a contrast to my earlier view.'
      ),
      createTestReflection(
        'ref-5',
        '2024-01-05T10:00:00Z',
        'Sequence of events: first I thought about scale, then about systems, then about media influence, then about contrast. This builds on earlier reflections.'
      ),
    ];

    // Fixed options to ensure determinism
    const opts = {
      maxDays: 14,
      topK: 4,
      weights: {
        scaleWeight: 0.25,
        systemicWeight: 0.25,
        mediaWeight: 0.15,
        contrastWeight: 0.11,
        sequenceDecayExponent: 1.5,
        minWeightThreshold: 0.48,
      },
    };

    // Run the function twice with identical inputs
    const result1 = buildNarrativeBridges(reflections, opts);
    const result2 = buildNarrativeBridges(reflections, opts);

    // Results must be identical
    expect(result1).toEqual(result2);

    // Verify structure: should be an array of NarrativeBridge objects
    expect(Array.isArray(result1)).toBe(true);
    expect(Array.isArray(result2)).toBe(true);
    expect(result1.length).toBe(result2.length);

    // If bridges were generated, verify each bridge is identical
    if (result1.length > 0) {
      for (let i = 0; i < result1.length; i++) {
        const bridge1 = result1[i];
        const bridge2 = result2[i];

        // Verify all fields match exactly
        expect(bridge1.from).toBe(bridge2.from);
        expect(bridge1.to).toBe(bridge2.to);
        expect(bridge1.weight).toBe(bridge2.weight);
        expect(bridge1.explanation).toBe(bridge2.explanation);
        expect(bridge1.reasons).toEqual(bridge2.reasons);
        expect(bridge1.signals).toEqual(bridge2.signals);
        expect(bridge1.anchorA).toBe(bridge2.anchorA);
        expect(bridge1.anchorB).toBe(bridge2.anchorB);
        expect(bridge1.isFallback).toBe(bridge2.isFallback);
        expect(bridge1.quality).toBe(bridge2.quality);
      }
    }
  });

  it('produces identical output even with different reflection order (input sorting)', () => {
    // Same reflections but in different order
    const reflections1 = [
      createTestReflection('ref-1', '2024-01-01T10:00:00Z', 'First reflection about scale.'),
      createTestReflection('ref-2', '2024-01-02T10:00:00Z', 'Second reflection about systems.'),
      createTestReflection('ref-3', '2024-01-03T10:00:00Z', 'Third reflection about media.'),
    ];

    const reflections2 = [
      createTestReflection('ref-3', '2024-01-03T10:00:00Z', 'Third reflection about media.'),
      createTestReflection('ref-1', '2024-01-01T10:00:00Z', 'First reflection about scale.'),
      createTestReflection('ref-2', '2024-01-02T10:00:00Z', 'Second reflection about systems.'),
    ];

    const opts = {
      maxDays: 14,
      topK: 4,
    };

    // Results should be identical because function sorts by createdAt internally
    const result1 = buildNarrativeBridges(reflections1, opts);
    const result2 = buildNarrativeBridges(reflections2, opts);

    expect(result1).toEqual(result2);
  });

  it('produces identical output when run multiple times in sequence', () => {
    const reflections = [
      createTestReflection('ref-1', '2024-01-01T10:00:00Z', 'Reflection about scale and magnitude.'),
      createTestReflection('ref-2', '2024-01-02T10:00:00Z', 'Reflection about systems and trust.'),
      createTestReflection('ref-3', '2024-01-03T10:00:00Z', 'Reflection about media and shows.'),
    ];

    const opts = {
      maxDays: 14,
      topK: 4,
    };

    // Run 5 times in sequence
    const results = Array.from({ length: 5 }, () => buildNarrativeBridges(reflections, opts));

    // All results must be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[0]).toEqual(results[i]);
    }
  });

  it('fails if randomness is introduced (detection test)', () => {
    // This test documents what would break determinism
    // If someone adds Math.random() or Date.now() to bridge generation,
    // the previous tests will fail

    const reflections = [
      createTestReflection('ref-1', '2024-01-01T10:00:00Z', 'Test reflection.'),
      createTestReflection('ref-2', '2024-01-02T10:00:00Z', 'Another test reflection.'),
    ];

    const result1 = buildNarrativeBridges(reflections);
    const result2 = buildNarrativeBridges(reflections);

    // If this fails, randomness or time-based logic was introduced
    expect(result1).toEqual(result2);
  });
});
