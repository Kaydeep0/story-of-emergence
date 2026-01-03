/**
 * Confidence Bands
 * 
 * Defines how confidence scores map to presentation treatment.
 * Bands affect presentation only, never meaning.
 */

export type ConfidenceBand = 'tentative' | 'emerging' | 'supported' | 'strong';

export interface ConfidenceBandInfo {
  band: ConfidenceBand;
  label: string;
}

/**
 * Get confidence band for a given score.
 * 
 * Bands:
 * - 0.0 – 0.29 → tentative
 * - 0.3 – 0.59 → emerging
 * - 0.6 – 0.79 → supported
 * - 0.8+ → strong
 */
export function getConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence < 0.3) {
    return 'tentative';
  } else if (confidence < 0.6) {
    return 'emerging';
  } else if (confidence < 0.8) {
    return 'supported';
  } else {
    return 'strong';
  }
}

/**
 * Get human-readable label for confidence band.
 */
export function getConfidenceBandLabel(band: ConfidenceBand): string {
  const labels: Record<ConfidenceBand, string> = {
    tentative: 'tentative',
    emerging: 'emerging',
    supported: 'supported',
    strong: 'strong',
  };
  return labels[band];
}

/**
 * Get full confidence band info (band + label).
 */
export function getConfidenceBandInfo(confidence: number): ConfidenceBandInfo {
  const band = getConfidenceBand(confidence);
  return {
    band,
    label: getConfidenceBandLabel(band),
  };
}

