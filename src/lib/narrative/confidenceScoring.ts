/**
 * Deterministic Confidence Scoring
 * 
 * Computes confidence scores for narrative candidates based solely on
 * observable structural patterns. No interpretation, no semantics.
 * 
 * Confidence reflects structural support only.
 * It does not imply truth or importance.
 */

interface ConfidenceInputs {
  sourceReflectionIds: string[];
  timeSpanDays?: number; // Time span covered by reflections
  frequencyCount?: number; // How many times something appears
  appearsAcrossMonths?: number; // Number of distinct months
  isFirstOrLast?: boolean; // Is this the first or last reflection of year
}

/**
 * Compute confidence score based on structural support.
 * 
 * Rules (all mechanical, no interpretation):
 * - 1 reflection → 0.2 base
 * - Appears in ≥3 reflections → +0.2
 * - Appears across ≥2 months → +0.2
 * - First or last reflection of year → +0.1
 * - Max cap: 1.0
 * 
 * @param inputs - Structural inputs for confidence calculation
 * @returns Confidence score between 0.0 and 1.0
 */
export function computeConfidence(inputs: ConfidenceInputs): number {
  let confidence = 0.0;

  const reflectionCount = inputs.sourceReflectionIds.length;

  // Base: 1 reflection → 0.2
  if (reflectionCount >= 1) {
    confidence = 0.2;
  }

  // Appears in ≥3 reflections → +0.2
  if (reflectionCount >= 3) {
    confidence += 0.2;
  }

  // Appears across ≥2 months → +0.2
  if (inputs.appearsAcrossMonths && inputs.appearsAcrossMonths >= 2) {
    confidence += 0.2;
  }

  // First or last reflection of year → +0.1
  if (inputs.isFirstOrLast) {
    confidence += 0.1;
  }

  // Additional support: frequency count (if provided)
  // Appears ≥5 times → +0.1
  if (inputs.frequencyCount && inputs.frequencyCount >= 5) {
    confidence += 0.1;
  }

  // Additional support: time span (if provided)
  // Spans ≥90 days → +0.1
  if (inputs.timeSpanDays && inputs.timeSpanDays >= 90) {
    confidence += 0.1;
  }

  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Helper to compute number of distinct months from reflection dates.
 */
export function computeDistinctMonths(
  reflectionDates: string[]
): number {
  const months = new Set<string>();
  
  for (const dateStr of reflectionDates) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      months.add(monthKey);
    }
  }
  
  return months.size;
}

/**
 * Helper to compute time span in days from reflection dates.
 */
export function computeTimeSpanDays(
  reflectionDates: string[]
): number {
  if (reflectionDates.length === 0) return 0;
  if (reflectionDates.length === 1) return 0;

  const dates = reflectionDates
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 2) return 0;

  const first = dates[0];
  const last = dates[dates.length - 1];
  const diffMs = last.getTime() - first.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

