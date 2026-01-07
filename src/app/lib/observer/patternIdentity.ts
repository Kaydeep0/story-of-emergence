// src/app/lib/observer/patternIdentity.ts
// Observer v1: Pattern Identity matching
// Pure function with strict types and no side effects

import type { PatternSignature } from './patternSignature';

/**
 * Coarse concentration band
 * 
 * Concentration bands must be coarse and ordinal (low, medium, high), not continuous.
 * This prevents drift where 0.31 vs 0.33 breaks identity.
 */
type ConcentrationBand = 'low' | 'medium' | 'high';

/**
 * Determine concentration band from top percentile share
 * 
 * Bands are coarse to preserve sameness under scale changes.
 */
function getConcentrationBand(topPercentileShare: number): ConcentrationBand {
  // Thresholds are coarse: low < 0.3, medium 0.3-0.6, high > 0.6
  if (topPercentileShare < 0.3) {
    return 'low';
  } else if (topPercentileShare <= 0.6) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * Check if two day-of-week pattern sets are the same
 * 
 * Sets are equal if they contain the same days.
 */
function sameDayOfWeekPattern(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const day of a) {
    if (!b.has(day)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if two pattern signatures represent the same pattern
 * 
 * Applies the identity rule from docs/PATTERN_SIGNATURE.md:
 * - Same observed distribution fit
 * - Same day-of-week pattern set
 * - Same concentration band (coarse, ordinal)
 * - Same relative spike threshold
 * 
 * Absolute values do not matter. Time direction does not matter.
 * 
 * @param a - First pattern signature
 * @param b - Second pattern signature
 * @returns true if patterns match, false otherwise
 */
export function samePattern(a: PatternSignature, b: PatternSignature): boolean {
  // Must have same observed distribution fit
  if (a.observedDistributionFit !== b.observedDistributionFit) {
    return false;
  }
  
  // Must have same day-of-week pattern set
  if (!sameDayOfWeekPattern(a.dayOfWeekPattern, b.dayOfWeekPattern)) {
    return false;
  }
  
  // Must have same concentration band (coarse, ordinal)
  const bandA = getConcentrationBand(a.topPercentileShare);
  const bandB = getConcentrationBand(b.topPercentileShare);
  if (bandA !== bandB) {
    return false;
  }
  
  // Must have same relative spike threshold
  // Allow small tolerance for floating point comparison (0.1)
  if (Math.abs(a.relativeSpikeThreshold - b.relativeSpikeThreshold) > 0.1) {
    return false;
  }
  
  return true;
}

