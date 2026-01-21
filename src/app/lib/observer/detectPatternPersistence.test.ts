// src/app/lib/observer/detectPatternPersistence.test.ts
// Observer v1: Unit tests for cross-lens pattern persistence detection
// Locks determinism, silence rules, and exact sentence output

import { describe, it, expect } from 'vitest';
import {
  detectPatternPersistence,
  type PatternSignature,
} from './detectPatternPersistence';

/**
 * Create a minimal test signature using only fields in stableKey ordering
 */
function createTestSignature(
  distributionClass: string,
  concentrationBand: "low" | "medium" | "high"
): PatternSignature {
  return {
    distributionClass,
    concentrationBand,
  };
}

describe('detectPatternPersistence', () => {
  describe('silence by default', () => {
    it('returns silence when weeklySignatures is empty', () => {
      const weeklySignatures: PatternSignature[] = [];
      const yearlySignatures: PatternSignature[] = [
        createTestSignature('powerlaw', 'high'),
      ];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({ speaks: false });
    });

    it('returns silence when yearlySignatures is empty', () => {
      const weeklySignatures: PatternSignature[] = [
        createTestSignature('powerlaw', 'high'),
      ];
      const yearlySignatures: PatternSignature[] = [];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({ speaks: false });
    });

    it('returns silence when both arrays are empty', () => {
      const weeklySignatures: PatternSignature[] = [];
      const yearlySignatures: PatternSignature[] = [];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({ speaks: false });
    });
  });

  describe('silence on no match', () => {
    it('returns silence when signatures differ by distributionClass', () => {
      const weeklySignatures: PatternSignature[] = [
        createTestSignature('powerlaw', 'high'),
      ];
      const yearlySignatures: PatternSignature[] = [
        createTestSignature('normal', 'high'),
      ];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({ speaks: false });
    });

    it('returns silence when signatures differ by concentrationBand', () => {
      const weeklySignatures: PatternSignature[] = [
        createTestSignature('powerlaw', 'high'),
      ];
      const yearlySignatures: PatternSignature[] = [
        createTestSignature('powerlaw', 'medium'),
      ];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({ speaks: false });
    });

    it('returns silence when signatures differ by optional field', () => {
      const weeklySignatures: PatternSignature[] = [
        {
          distributionClass: 'powerlaw',
          concentrationBand: 'high',
          dayOfWeekShape: 'weekend',
        },
      ];
      const yearlySignatures: PatternSignature[] = [
        {
          distributionClass: 'powerlaw',
          concentrationBand: 'high',
          dayOfWeekShape: 'weekday',
        },
      ];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({ speaks: false });
    });
  });

  describe('speaks on exact match', () => {
    it('returns exact sentence when signatures match exactly', () => {
      const matchingSignature: PatternSignature = createTestSignature('powerlaw', 'high');
      const weeklySignatures: PatternSignature[] = [matchingSignature];
      const yearlySignatures: PatternSignature[] = [matchingSignature];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({
        speaks: true,
        sentence: "This pattern appears in both Weekly and Yearly views.",
        lenses: ["weekly", "yearly"],
        signature: matchingSignature,
      });
    });

    it('returns exact sentence with all optional fields matching', () => {
      const matchingSignature: PatternSignature = {
        distributionClass: 'lognormal',
        concentrationBand: 'medium',
        dayOfWeekShape: 'weekend',
        topPercentileShareBand: 'high',
        spikeThresholdBand: 'low',
      };
      const weeklySignatures: PatternSignature[] = [matchingSignature];
      const yearlySignatures: PatternSignature[] = [matchingSignature];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result).toEqual({
        speaks: true,
        sentence: "This pattern appears in both Weekly and Yearly views.",
        lenses: ["weekly", "yearly"],
        signature: matchingSignature,
      });
    });

    it('returns signature that deep equals the matched signature', () => {
      const matchingSignature: PatternSignature = {
        distributionClass: 'normal',
        concentrationBand: 'low',
        dayOfWeekShape: 'weekday',
      };
      const weeklySignatures: PatternSignature[] = [matchingSignature];
      const yearlySignatures: PatternSignature[] = [matchingSignature];

      const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });

      expect(result.speaks).toBe(true);
      if (result.speaks) {
        expect(result.signature).toEqual(matchingSignature);
        expect(result.lenses).toEqual(["weekly", "yearly"]);
      }
    });
  });

  describe('determinism with multiple matches', () => {
    it('produces identical output across 10 repeated runs', () => {
      const signatureA: PatternSignature = createTestSignature('powerlaw', 'high');
      const signatureB: PatternSignature = createTestSignature('normal', 'medium');

      const weeklySignatures: PatternSignature[] = [signatureA, signatureB];
      const yearlySignatures: PatternSignature[] = [signatureB, signatureA];

      // Run 10 times
      const results = Array.from({ length: 10 }, () =>
        detectPatternPersistence({ weeklySignatures, yearlySignatures })
      );

      // All results must be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[0]).toEqual(results[i]);
      }

      // Should speak (both signatures match)
      expect(results[0].speaks).toBe(true);
    });

    it('produces identical output even when input arrays are shuffled', () => {
      const signatureA: PatternSignature = createTestSignature('powerlaw', 'high');
      const signatureB: PatternSignature = createTestSignature('lognormal', 'medium');
      const signatureC: PatternSignature = createTestSignature('normal', 'low');

      // Both arrays contain A and B (matching), plus C (non-matching)
      const weeklySignatures1: PatternSignature[] = [signatureA, signatureB, signatureC];
      const yearlySignatures1: PatternSignature[] = [signatureB, signatureA, signatureC];

      const weeklySignatures2: PatternSignature[] = [signatureC, signatureA, signatureB];
      const yearlySignatures2: PatternSignature[] = [signatureC, signatureB, signatureA];

      const result1 = detectPatternPersistence({
        weeklySignatures: weeklySignatures1,
        yearlySignatures: yearlySignatures1,
      });
      const result2 = detectPatternPersistence({
        weeklySignatures: weeklySignatures2,
        yearlySignatures: yearlySignatures2,
      });

      // Results must be identical despite different input order
      expect(result1).toEqual(result2);

      // Should speak (A and B both match)
      expect(result1.speaks).toBe(true);
      if (result1.speaks && result2.speaks) {
        // Both should return the same signature (deterministic selection)
        expect(result1.signature).toEqual(result2.signature);
      }
    });

    it('selects the same signature deterministically when multiple matches exist', () => {
      // Create signatures that will sort deterministically
      // Signature A will sort before B (alphabetically by stableKey)
      const signatureA: PatternSignature = createTestSignature('lognormal', 'low');
      const signatureB: PatternSignature = createTestSignature('powerlaw', 'high');

      const weeklySignatures: PatternSignature[] = [signatureB, signatureA];
      const yearlySignatures: PatternSignature[] = [signatureA, signatureB];

      // Run multiple times with different input orders
      const results = [
        detectPatternPersistence({ weeklySignatures, yearlySignatures }),
        detectPatternPersistence({ weeklySignatures: [...weeklySignatures].reverse(), yearlySignatures }),
        detectPatternPersistence({ weeklySignatures, yearlySignatures: [...yearlySignatures].reverse() }),
        detectPatternPersistence({
          weeklySignatures: [...weeklySignatures].reverse(),
          yearlySignatures: [...yearlySignatures].reverse(),
        }),
      ];

      // All results must select the same signature (deterministic tie-break)
      expect(results[0].speaks).toBe(true);
      if (results[0].speaks) {
        const selectedSignature = results[0].signature;
        for (let i = 1; i < results.length; i++) {
          expect(results[i].speaks).toBe(true);
          if (results[i].speaks) {
            expect(results[i].signature).toEqual(selectedSignature);
          }
        }
      }
    });

    it('produces byte-stable output across repeated runs', () => {
      const signatureA: PatternSignature = {
        distributionClass: 'powerlaw',
        concentrationBand: 'high',
        dayOfWeekShape: 'weekend',
        topPercentileShareBand: 'high',
        spikeThresholdBand: 'low',
      };
      const signatureB: PatternSignature = {
        distributionClass: 'normal',
        concentrationBand: 'medium',
        dayOfWeekShape: 'weekday',
        topPercentileShareBand: 'medium',
        spikeThresholdBand: 'medium',
      };

      const weeklySignatures: PatternSignature[] = [signatureA, signatureB];
      const yearlySignatures: PatternSignature[] = [signatureB, signatureA];

      // Run 5 times and stringify each result
      const stringifiedResults = Array.from({ length: 5 }, () => {
        const result = detectPatternPersistence({ weeklySignatures, yearlySignatures });
        return JSON.stringify(result);
      });

      // All stringified results must be identical (byte-stable)
      for (let i = 1; i < stringifiedResults.length; i++) {
        expect(stringifiedResults[0]).toBe(stringifiedResults[i]);
      }
    });
  });
});
