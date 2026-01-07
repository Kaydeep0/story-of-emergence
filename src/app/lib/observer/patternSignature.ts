// src/app/lib/observer/patternSignature.ts
// Observer v1: Pattern Signature computation
// Pure function with strict types and no side effects

/**
 * Pattern Signature
 * 
 * A structural description of how activity distributes across a time window.
 * Describes observable characteristics without interpretation.
 * 
 * See docs/PATTERN_SIGNATURE.md for the schema definition.
 */
export type PatternSignature = {
  /** Best-fit class among {normal, log-normal, power law} */
  observedDistributionFit: 'normal' | 'lognormal' | 'powerlaw';
  
  /** Ratio of top activity days to average activity days */
  concentrationRatio: number;
  
  /** Which days of the week show activity, expressed as a set */
  dayOfWeekPattern: Set<number>; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  /** Percentage of total activity accounted for by the top 10% of days */
  topPercentileShare: number;
  
  /** Multiplier that defines a "spike" relative to the window's baseline */
  relativeSpikeThreshold: number; // e.g., 2.0 means 2× average
};

/**
 * Input data required to compute a pattern signature
 * 
 * This data should already be available in InsightArtifact or DistributionResult
 */
export type PatternSignatureInput = {
  /** Distribution classification from computeDistributionLayer */
  distributionClassification: 'normal' | 'lognormal' | 'powerlaw' | null;
  
  /** Spike ratio from distribution stats */
  spikeRatio: number; // max day / median day
  
  /** Top 10% share from distribution stats */
  top10PercentDaysShare: number;
  
  /** Daily counts array for computing day-of-week pattern */
  dailyCounts: Array<{ date: string; count: number }>; // date in YYYY-MM-DD format
  
  /** Relative spike threshold used (default 2.0) */
  spikeThreshold?: number;
};

/**
 * Compute pattern signature from window-level distribution metrics
 * 
 * Returns null if required metrics are missing or insufficient data.
 * 
 * @param input - Distribution metrics from artifact
 * @returns PatternSignature or null if insufficient data
 */
export function makePatternSignature(input: PatternSignatureInput): PatternSignature | null {
  // Require distribution classification
  if (!input.distributionClassification) {
    return null;
  }
  
  // Require valid spike ratio (must be > 0)
  if (!input.spikeRatio || input.spikeRatio <= 0 || !isFinite(input.spikeRatio)) {
    return null;
  }
  
  // Require valid top percentile share (0-1 range)
  if (input.top10PercentDaysShare < 0 || input.top10PercentDaysShare > 1 || !isFinite(input.top10PercentDaysShare)) {
    return null;
  }
  
  // Require at least some daily counts to compute day-of-week pattern
  if (!input.dailyCounts || input.dailyCounts.length === 0) {
    return null;
  }
  
  // Compute day-of-week pattern from daily counts
  // A day is "active" if it has at least one entry
  const activeDays = new Set<number>();
  for (const { date, count } of input.dailyCounts) {
    if (count > 0) {
      const dateObj = new Date(date + 'T00:00:00');
      if (!isNaN(dateObj.getTime())) {
        const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
        activeDays.add(dayOfWeek);
      }
    }
  }
  
  // Require at least one active day
  if (activeDays.size === 0) {
    return null;
  }
  
  // Compute concentration ratio
  // This is the spike ratio (max/median), which represents concentration
  const concentrationRatio = input.spikeRatio;
  
  // Use provided spike threshold or default to 2.0
  const relativeSpikeThreshold = input.spikeThreshold ?? 2.0;
  
  return {
    observedDistributionFit: input.distributionClassification,
    concentrationRatio,
    dayOfWeekPattern: activeDays,
    topPercentileShare: input.top10PercentDaysShare,
    relativeSpikeThreshold,
  };
}

