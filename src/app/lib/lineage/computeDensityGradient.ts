/**
 * Structural Density Gradient
 * 
 * Captures how density changes across adjacent neighborhoods,
 * without introducing direction, causality, hierarchy, or optimization.
 * 
 * This measures variation of concentration, not movement, growth, or flow.
 * 
 * Requirements:
 * - Gradient definition: computed from differences in density between neighboring reflections
 * - Non-directional: magnitude of density difference only, no "toward" or "away"
 * - Non-causal: does not imply transition, drift, or movement
 * - Deterministic: same neighborhood + same densities → same gradient
 * - Read-only and isolated: must not influence meaning reinforcement, decay, novelty, saturation, regime, dwell time, distance, neighborhood membership, or density itself
 * - Session scoped: computed per wallet session
 * - Encrypted at rest: encrypted client-side, stored separately
 * - No semantics: no labels, clustering, or optimization targets
 * - UI inaccessible: no visualization, querying, or exposure
 */

import type { StructuralNeighborhoodIndex } from './buildNeighborhoodIndex';
import type { StructuralDensityMap } from './computeStructuralDensity';

export type DensityGradient = {
  reflectionId: string;
  gradientMagnitude: number; // Magnitude of density difference (non-negative)
};

export type StructuralDensityGradient = {
  gradients: DensityGradient[]; // One gradient per reflection
  sessionId: string;
  createdAt: string; // ISO timestamp
};

export type GradientSignals = {
  neighborhoodIndex: StructuralNeighborhoodIndex;
  densityMap: StructuralDensityMap;
  sessionId: string;
};

/**
 * Compute structural density gradient from neighborhood index and density map
 * 
 * Gradient is computed from differences in density between neighboring reflections.
 * Gradient represents magnitude of density difference only (non-directional).
 * 
 * Deterministic: same neighborhood + same densities → same gradient
 * Non-causal: does not imply transition, drift, or movement
 * 
 * @param signals - Gradient computation signals
 * @returns StructuralDensityGradient
 */
export function computeDensityGradient(signals: GradientSignals): StructuralDensityGradient {
  const { neighborhoodIndex, densityMap, sessionId } = signals;

  const { neighborhoods } = neighborhoodIndex;
  const { densities } = densityMap;

  if (neighborhoods.length === 0 || densities.length === 0) {
    return {
      gradients: [],
      sessionId,
      createdAt: new Date().toISOString(),
    };
  }

  // Build density lookup map
  const densityLookup = new Map<string, number>();
  densities.forEach((density) => {
    densityLookup.set(density.reflectionId, density.density);
  });

  // Compute gradient for each reflection
  const gradients: DensityGradient[] = neighborhoods.map((neighborhood) => {
    const reflectionId = neighborhood.reflectionId;
    const reflectionDensity = densityLookup.get(reflectionId) || 0;

    // Compute gradient magnitude as average absolute difference from neighbors
    // This is non-directional: magnitude only, no "toward" or "away"
    let totalDifference = 0;
    let neighborCount = 0;

    neighborhood.neighborIds.forEach((neighborId) => {
      if (neighborId !== reflectionId) {
        const neighborDensity = densityLookup.get(neighborId) || 0;
        const difference = Math.abs(reflectionDensity - neighborDensity);
        totalDifference += difference;
        neighborCount++;
      }
    });

    // Average absolute difference (magnitude only, non-directional)
    const gradientMagnitude = neighborCount > 0 ? totalDifference / neighborCount : 0;

    return {
      reflectionId,
      gradientMagnitude,
    };
  });

  return {
    gradients,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get gradient for a reflection
 * 
 * @param gradient - Structural density gradient
 * @param reflectionId - Reflection ID
 * @returns Gradient magnitude or null if not found
 */
export function getGradient(
  gradient: StructuralDensityGradient,
  reflectionId: string
): number | null {
  const grad = gradient.gradients.find(g => g.reflectionId === reflectionId);
  return grad ? grad.gradientMagnitude : null;
}

/**
 * Get all gradients
 * 
 * @param gradient - Structural density gradient
 * @returns Array of gradient values (unordered)
 */
export function getAllGradients(
  gradient: StructuralDensityGradient
): DensityGradient[] {
  return [...gradient.gradients];
}

