/**
 * Structural Density Estimation
 * 
 * Measures how locally crowded a reflection's neighborhood is,
 * without ranking, comparison, or semantic interpretation.
 * 
 * This captures concentration without value.
 * 
 * Requirements:
 * - Density definition: density = size of a reflection's structural neighborhood
 * - Non-comparative: absolute counts, no percentile/z-score/relative framing, no "high"/"low" labels
 * - Deterministic: same neighborhood → same density
 * - Read-only and isolated: must not influence meaning reinforcement, decay, novelty, saturation, regime, dwell time, distance, or neighborhood membership
 * - Session scoped: computed per wallet session
 * - Encrypted at rest: density values encrypted client-side, stored separately
 * - No semantics: no interpretation, no topic inference, no embedding usage
 * - UI inaccessible: no visualization, querying, or exposure
 */

import type { StructuralNeighborhoodIndex } from './buildNeighborhoodIndex';

export type StructuralDensity = {
  reflectionId: string;
  density: number; // Absolute count: size of neighborhood
};

export type StructuralDensityMap = {
  densities: StructuralDensity[]; // One density per reflection
  sessionId: string;
  createdAt: string; // ISO timestamp
};

export type DensitySignals = {
  neighborhoodIndex: StructuralNeighborhoodIndex;
  sessionId: string;
};

/**
 * Compute structural density map from neighborhood index
 * 
 * Density = size of a reflection's structural neighborhood
 * Computed directly from the neighborhood index as an absolute count.
 * 
 * Deterministic: same neighborhood → same density
 * Non-comparative: absolute counts, no normalization or ranking
 * 
 * @param signals - Density computation signals
 * @returns StructuralDensityMap
 */
export function computeStructuralDensity(signals: DensitySignals): StructuralDensityMap {
  const { neighborhoodIndex, sessionId } = signals;

  const { neighborhoods } = neighborhoodIndex;

  if (neighborhoods.length === 0) {
    return {
      densities: [],
      sessionId,
      createdAt: new Date().toISOString(),
    };
  }

  // Compute density for each reflection
  // Density = size of neighborhood (absolute count)
  const densities: StructuralDensity[] = neighborhoods.map((neighborhood) => ({
    reflectionId: neighborhood.reflectionId,
    density: neighborhood.neighborIds.length, // Absolute count, no weighting or normalization
  }));

  return {
    densities,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get density for a reflection
 * 
 * @param densityMap - Structural density map
 * @param reflectionId - Reflection ID
 * @returns Density value or null if not found
 */
export function getDensity(
  densityMap: StructuralDensityMap,
  reflectionId: string
): number | null {
  const density = densityMap.densities.find(d => d.reflectionId === reflectionId);
  return density ? density.density : null;
}

/**
 * Get all densities
 * 
 * @param densityMap - Structural density map
 * @returns Array of density values (unordered)
 */
export function getAllDensities(
  densityMap: StructuralDensityMap
): StructuralDensity[] {
  return [...densityMap.densities];
}

