/**
 * Structural Curvature Index
 * 
 * Captures whether local neighborhoods bend or flatten relative to surrounding neighborhoods,
 * without introducing hierarchy, optimization, flow, or interpretation.
 * 
 * This measures shape of space, not meaning, motion, or progress.
 * 
 * Requirements:
 * - Curvature definition: computed from structural distance, neighborhood relationships, and density gradient
 * - Measures deviation from locally uniform structure
 * - No global reference frame
 * - Non-hierarchical: no center points, baselines, ideal geometry, or normal form
 * - Non-directional: unsigned magnitude only, no inward/outward semantics
 * - Non-causal: does not imply tension, instability, pressure, or change
 * - Deterministic: same structure → same curvature
 * - Read-only and isolated: must not influence meaning inference, decay, novelty, reinforcement, saturation, regime, dwell time, density, density gradient, distance, or neighborhood membership
 * - Session scoped: computed per wallet session
 * - Encrypted at rest: stored encrypted client-side, stored separately from all other structural metrics
 * - No semantics: no labels, clustering, thresholds, or alerts
 * - UI inaccessible: no visualization, querying, or exposure
 */

import type { StructuralDistanceMatrix } from './computeStructuralDistance';
import type { StructuralNeighborhoodIndex } from './buildNeighborhoodIndex';
import type { StructuralDensityGradient } from './computeDensityGradient';

export type StructuralCurvature = {
  reflectionId: string;
  curvatureMagnitude: number; // Unsigned magnitude (non-negative), deviation from locally uniform structure
};

export type StructuralCurvatureIndex = {
  curvatures: StructuralCurvature[]; // One curvature per reflection
  sessionId: string;
  createdAt: string; // ISO timestamp
};

export type CurvatureSignals = {
  distanceMatrix: StructuralDistanceMatrix;
  neighborhoodIndex: StructuralNeighborhoodIndex;
  densityGradient: StructuralDensityGradient;
  sessionId: string;
};

/**
 * Compute structural curvature index from distance matrix, neighborhood index, and density gradient
 * 
 * Curvature measures deviation from locally uniform structure.
 * 
 * Computation approach:
 * - For each reflection, examine its neighborhood
 * - Compute variance of distances to neighbors (measures non-uniformity)
 * - Normalize by average distance (relative measure)
 * - Incorporate density gradient to capture local variation
 * - Result is unsigned magnitude only (non-directional, non-causal)
 * 
 * Deterministic: same structure → same curvature
 * Non-hierarchical: no center points, baselines, or ideal geometry
 * Non-directional: unsigned magnitude only
 * 
 * @param signals - Curvature computation signals
 * @returns StructuralCurvatureIndex
 */
export function computeStructuralCurvature(signals: CurvatureSignals): StructuralCurvatureIndex {
  const { distanceMatrix, neighborhoodIndex, densityGradient, sessionId } = signals;

  const { distances } = distanceMatrix;
  const { neighborhoods } = neighborhoodIndex;
  const { gradients } = densityGradient;

  if (neighborhoods.length === 0 || gradients.length === 0) {
    return {
      curvatures: [],
      sessionId,
      createdAt: new Date().toISOString(),
    };
  }

  // Build gradient lookup map
  const gradientLookup = new Map<string, number>();
  gradients.forEach((grad) => {
    gradientLookup.set(grad.reflectionId, grad.gradientMagnitude);
  });

  // Compute curvature for each reflection
  const curvatures: StructuralCurvature[] = neighborhoods.map((neighborhood) => {
    const reflectionId = neighborhood.reflectionId;
    const neighborIds = neighborhood.neighborIds.filter(id => id !== reflectionId);

    if (neighborIds.length === 0) {
      // No neighbors = no curvature (uniform by definition)
      return {
        reflectionId,
        curvatureMagnitude: 0,
      };
    }

    // Get distances to neighbors
    const distancesToNeighbors: number[] = [];
    const reflectionDistances = distances[reflectionId];
    
    if (!reflectionDistances) {
      return {
        reflectionId,
        curvatureMagnitude: 0,
      };
    }

    neighborIds.forEach((neighborId) => {
      const distance = reflectionDistances[neighborId];
      if (distance !== undefined && distance !== Infinity) {
        distancesToNeighbors.push(distance);
      }
    });

    if (distancesToNeighbors.length === 0) {
      return {
        reflectionId,
        curvatureMagnitude: 0,
      };
    }

    // Compute variance of distances (measures deviation from uniform structure)
    const meanDistance = distancesToNeighbors.reduce((sum, d) => sum + d, 0) / distancesToNeighbors.length;
    const variance = distancesToNeighbors.reduce((sum, d) => {
      const diff = d - meanDistance;
      return sum + (diff * diff);
    }, 0) / distancesToNeighbors.length;

    // Normalize by mean distance to get relative measure (coefficient of variation)
    // This gives a measure of how "non-uniform" the local structure is
    const relativeVariance = meanDistance > 0 ? variance / (meanDistance * meanDistance) : 0;

    // Incorporate density gradient to capture local variation
    // Higher gradient indicates more variation in density, which contributes to curvature
    const gradientMagnitude = gradientLookup.get(reflectionId) || 0;

    // Combine distance variance and density gradient
    // Both contribute to curvature (deviation from uniform structure)
    // Weight: 70% distance variance, 30% density gradient
    const curvatureMagnitude = (relativeVariance * 0.7) + (gradientMagnitude * 0.3);

    return {
      reflectionId,
      curvatureMagnitude: Math.max(0, curvatureMagnitude), // Ensure non-negative
    };
  });

  return {
    curvatures,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get curvature for a reflection
 * 
 * @param curvatureIndex - Structural curvature index
 * @param reflectionId - Reflection ID
 * @returns Curvature magnitude or null if not found
 */
export function getCurvature(
  curvatureIndex: StructuralCurvatureIndex,
  reflectionId: string
): number | null {
  const curvature = curvatureIndex.curvatures.find(c => c.reflectionId === reflectionId);
  return curvature ? curvature.curvatureMagnitude : null;
}

/**
 * Get all curvatures
 * 
 * @param curvatureIndex - Structural curvature index
 * @returns Array of curvature values (unordered)
 */
export function getAllCurvatures(
  curvatureIndex: StructuralCurvatureIndex
): StructuralCurvature[] {
  return [...curvatureIndex.curvatures];
}

