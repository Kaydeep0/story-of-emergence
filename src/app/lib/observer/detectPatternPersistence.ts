// src/app/lib/observer/detectPatternPersistence.ts
// Observer v1: Cross-Lens Pattern Persistence Detector v1
// Pure deterministic function with no side effects

/**
 * Lens name identifier
 */
export type LensName = "weekly" | "yearly";

/**
 * Pattern Signature
 * 
 * Structural description of activity distribution using coarse bands.
 * All fields use ordinal bands (low/medium/high) to prevent drift.
 */
export type PatternSignature = {
  /** Distribution classification */
  distributionClass: string;
  
  /** Concentration band (coarse, ordinal) */
  concentrationBand: "low" | "medium" | "high";
  
  /** Day-of-week pattern shape (optional) */
  dayOfWeekShape?: string;
  
  /** Top percentile share band (optional) */
  topPercentileShareBand?: "low" | "medium" | "high";
  
  /** Spike threshold band (optional) */
  spikeThresholdBand?: "low" | "medium" | "high";
};

/**
 * Pattern Persistence Result
 * 
 * Either silence (speaks: false) or a single sentence statement (speaks: true).
 */
export type PersistenceResult =
  | { speaks: false }
  | {
      speaks: true;
      sentence: "This pattern appears in both Weekly and Yearly views.";
      lenses: [LensName, LensName];
      signature: PatternSignature;
    };

/**
 * Build a stable string key from a pattern signature
 * 
 * Uses fixed field order to ensure deterministic sorting.
 * 
 * @param signature - Pattern signature to key
 * @returns Stable string key
 */
function stableKey(signature: PatternSignature): string {
  // Fixed field order: distributionClass, concentrationBand, dayOfWeekShape, topPercentileShareBand, spikeThresholdBand
  const parts = [
    signature.distributionClass,
    signature.concentrationBand,
    signature.dayOfWeekShape ?? '',
    signature.topPercentileShareBand ?? '',
    signature.spikeThresholdBand ?? '',
  ];
  return parts.join('|');
}

/**
 * Check if two pattern signatures are exactly equal
 * 
 * All fields must match exactly for equality.
 * 
 * @param a - First signature
 * @param b - Second signature
 * @returns true if signatures match exactly
 */
function signaturesMatch(a: PatternSignature, b: PatternSignature): boolean {
  return (
    a.distributionClass === b.distributionClass &&
    a.concentrationBand === b.concentrationBand &&
    a.dayOfWeekShape === b.dayOfWeekShape &&
    a.topPercentileShareBand === b.topPercentileShareBand &&
    a.spikeThresholdBand === b.spikeThresholdBand
  );
}

/**
 * Detect pattern persistence across Weekly and Yearly lenses
 * 
 * Rules:
 * - Deterministic, no time, no randomness
 * - Silence unless there is at least one exact signature match between weekly and yearly
 * - If multiple matches exist, pick one deterministically by stable stringify sort
 * - Return the exact sentence string when speaks is true
 * 
 * @param args - Weekly and yearly pattern signatures
 * @returns PersistenceResult with either silence or the exact sentence
 */
export function detectPatternPersistence(args: {
  weeklySignatures: PatternSignature[];
  yearlySignatures: PatternSignature[];
}): PersistenceResult {
  const { weeklySignatures, yearlySignatures } = args;
  
  // Silence if either array is empty
  if (!weeklySignatures || weeklySignatures.length === 0 ||
      !yearlySignatures || yearlySignatures.length === 0) {
    return { speaks: false };
  }
  
  // Find all exact matches between weekly and yearly signatures
  const matches: Array<{ weekly: PatternSignature; yearly: PatternSignature }> = [];
  
  for (const weeklySig of weeklySignatures) {
    for (const yearlySig of yearlySignatures) {
      if (signaturesMatch(weeklySig, yearlySig)) {
        matches.push({ weekly: weeklySig, yearly: yearlySig });
      }
    }
  }
  
  // Silence if no matches found
  if (matches.length === 0) {
    return { speaks: false };
  }
  
  // If multiple matches exist, pick one deterministically by stable stringify sort
  // Sort matches by stable key, then pick the first one
  const sortedMatches = matches.sort((a, b) => {
    const keyA = stableKey(a.weekly);
    const keyB = stableKey(b.weekly);
    return keyA.localeCompare(keyB);
  });
  
  // Use the first match after deterministic sorting
  const selectedMatch = sortedMatches[0];
  
  // Return the exact sentence as specified
  return {
    speaks: true,
    sentence: "This pattern appears in both Weekly and Yearly views.",
    lenses: ["weekly", "yearly"],
    signature: selectedMatch.weekly,
  };
}
