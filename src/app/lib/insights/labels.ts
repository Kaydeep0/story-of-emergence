import { calculateDensity, type DensityLevel } from './density';
import { classifyCadence, type CadenceType } from './cadence';

export type InsightLabelInput = {
  totalEvents: number;
  scope: 'week' | 'month' | 'year';
  bucketCounts: number[];
};

/**
 * Generate descriptive label combining density and cadence
 * Deterministic string templates only
 * @param input Total events, scope, and bucket counts
 * @returns Human-readable label string
 */
export function generateInsightLabel(input: InsightLabelInput): string {
  const { totalEvents, scope, bucketCounts } = input;

  const density = calculateDensity({ totalEvents, scope });
  const cadence = classifyCadence(bucketCounts);

  return combineDensityAndCadence(density, cadence);
}

/**
 * Combine density and cadence into readable label
 * Deterministic templates
 */
function combineDensityAndCadence(
  density: DensityLevel,
  cadence: CadenceType
): string {
  // Template combinations
  const templates: Record<DensityLevel, Record<CadenceType, string>> = {
    low: {
      sporadic: 'Low density, sporadic reflection',
      steady: 'Low density, steady engagement',
      bursty: 'Low density, bursty focus',
    },
    moderate: {
      sporadic: 'Moderate activity, sporadic reflection',
      steady: 'Moderate activity, steady engagement',
      bursty: 'Moderate activity with bursty focus',
    },
    high: {
      sporadic: 'High density, sporadic reflection',
      steady: 'High density, steady engagement',
      bursty: 'High density, bursty focus',
    },
  };

  return templates[density][cadence];
}

