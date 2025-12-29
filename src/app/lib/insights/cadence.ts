/**
 * Cadence classification for distribution insights
 * Pure function, explainable heuristics
 */

export type CadenceType = 'sporadic' | 'steady' | 'bursty';

/**
 * Classify cadence pattern based on bucket counts
 * Explainability matters more than math purity
 * @param bucketCounts Array of event counts per bucket
 * @returns Cadence type: sporadic, steady, or bursty
 */
export function classifyCadence(bucketCounts: number[]): CadenceType {
  if (bucketCounts.length === 0) {
    return 'sporadic';
  }

  // Filter out zeros for variance calculation
  const nonZeroCounts = bucketCounts.filter(count => count > 0);

  if (nonZeroCounts.length === 0) {
    return 'sporadic';
  }

  // Calculate mean
  const mean = nonZeroCounts.reduce((sum, count) => sum + count, 0) / nonZeroCounts.length;

  // Calculate variance
  const variance = nonZeroCounts.reduce((sum, count) => {
    const diff = count - mean;
    return sum + (diff * diff);
  }, 0) / nonZeroCounts.length;

  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (CV) = stdDev / mean
  // Higher CV indicates more variance
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

  // Count zeros (gaps)
  const zeroCount = bucketCounts.length - nonZeroCounts.length;
  const zeroRatio = zeroCount / bucketCounts.length;

  // Check for bursty pattern: one or two buckets dominate
  const sortedCounts = [...bucketCounts].sort((a, b) => b - a);
  const topTwoSum = sortedCounts.slice(0, 2).reduce((sum, count) => sum + count, 0);
  const totalSum = bucketCounts.reduce((sum, count) => sum + count, 0);
  const topTwoRatio = totalSum > 0 ? topTwoSum / totalSum : 0;

  // Sporadic: many zeros OR high variance
  if (zeroRatio > 0.5 || coefficientOfVariation > 1.5) {
    return 'sporadic';
  }

  // Bursty: top two buckets account for > 60% of total
  if (topTwoRatio > 0.6) {
    return 'bursty';
  }

  // Steady: low variance, no long gaps
  return 'steady';
}

