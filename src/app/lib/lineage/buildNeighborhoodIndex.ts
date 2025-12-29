/**
 * Structural Neighborhood Index
 * 
 * Identifies which reflections exist within a local structural vicinity
 * of one another, without ranking, clustering, or assigning importance.
 * 
 * This defines adjacency without hierarchy.
 * 
 * Requirements:
 * - Neighborhood definition: reflections whose structural distance ≤ D (fixed internal constant)
 * - No ranking or ordering: unordered sets, no "closest first", no center node
 * - Deterministic and symmetric: if A is in B's neighborhood, B is in A's neighborhood
 * - Read-only and isolated: must not influence emergence, novelty, decay, saturation, regime, dwell time
 * - Session scoped: computed per wallet session
 * - Encrypted at rest: encrypted client-side, stored separately
 * - No semantics: no text similarity, embeddings, topic inference, labeling
 * - UI inaccessible: no visualization, querying, or exposure
 */

import type { StructuralDistanceMatrix } from './computeStructuralDistance';

export type StructuralNeighborhood = {
  reflectionId: string;
  neighborIds: string[]; // Unordered set of neighbor IDs
};

export type StructuralNeighborhoodIndex = {
  neighborhoods: StructuralNeighborhood[]; // One neighborhood per reflection
  distanceThreshold: number; // Fixed internal constant D
  sessionId: string;
  createdAt: string; // ISO timestamp
};

export type NeighborhoodSignals = {
  distanceMatrix: StructuralDistanceMatrix;
  distanceThreshold?: number; // Default 0.5
  sessionId: string;
};

/**
 * Fixed internal constant for neighborhood distance threshold
 * No adaptive thresholds, no population normalization
 */
const DEFAULT_DISTANCE_THRESHOLD = 0.5;

/**
 * Build structural neighborhood index from distance matrix
 * 
 * A neighborhood is defined as a set of reflections whose structural distance ≤ D.
 * Neighborhoods are unordered sets with no ranking, ordering, or center node.
 * 
 * Deterministic: same distance matrix → same neighborhoods
 * Symmetric: if A is in B's neighborhood, B is in A's neighborhood
 * 
 * @param signals - Neighborhood construction signals
 * @returns StructuralNeighborhoodIndex
 */
export function buildNeighborhoodIndex(signals: NeighborhoodSignals): StructuralNeighborhoodIndex {
  const { distanceMatrix, distanceThreshold = DEFAULT_DISTANCE_THRESHOLD, sessionId } = signals;

  const { distances } = distanceMatrix;

  if (Object.keys(distances).length === 0) {
    return {
      neighborhoods: [],
      distanceThreshold,
      sessionId,
      createdAt: new Date().toISOString(),
    };
  }

  const reflectionIds = Object.keys(distances);
  const neighborhoods: StructuralNeighborhood[] = [];

  // Build neighborhood for each reflection
  reflectionIds.forEach((reflectionId) => {
    const neighborIds: string[] = [];
    const reflectionDistances = distances[reflectionId] || {};

    // Find all reflections within distance threshold
    reflectionIds.forEach((otherId) => {
      if (otherId === reflectionId) {
        // Self is always in neighborhood (distance 0)
        neighborIds.push(otherId);
      } else {
        const distance = reflectionDistances[otherId];
        if (distance !== undefined && distance <= distanceThreshold && distance !== Infinity) {
          neighborIds.push(otherId);
        }
      }
    });

    // Store neighborhood as unordered set (no ranking or ordering)
    neighborhoods.push({
      reflectionId,
      neighborIds, // Unordered set
    });
  });

  // Verify symmetry: if A is in B's neighborhood, B is in A's neighborhood
  // This is guaranteed by symmetric distance matrix, but we verify for correctness
  neighborhoods.forEach((neighborhood) => {
    neighborhood.neighborIds.forEach((neighborId) => {
      const neighborNeighborhood = neighborhoods.find(n => n.reflectionId === neighborId);
      if (neighborNeighborhood && !neighborNeighborhood.neighborIds.includes(neighborhood.reflectionId)) {
        // Ensure symmetry
        neighborNeighborhood.neighborIds.push(neighborhood.reflectionId);
      }
    });
  });

  return {
    neighborhoods,
    distanceThreshold,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get neighborhood for a reflection
 * 
 * @param index - Structural neighborhood index
 * @param reflectionId - Reflection ID
 * @returns Neighborhood or null if not found
 */
export function getNeighborhood(
  index: StructuralNeighborhoodIndex,
  reflectionId: string
): StructuralNeighborhood | null {
  return index.neighborhoods.find(n => n.reflectionId === reflectionId) || null;
}

/**
 * Check if two reflections are neighbors
 * 
 * @param index - Structural neighborhood index
 * @param reflectionId1 - First reflection ID
 * @param reflectionId2 - Second reflection ID
 * @returns true if reflections are neighbors
 */
export function areNeighbors(
  index: StructuralNeighborhoodIndex,
  reflectionId1: string,
  reflectionId2: string
): boolean {
  const neighborhood = getNeighborhood(index, reflectionId1);
  return neighborhood ? neighborhood.neighborIds.includes(reflectionId2) : false;
}

/**
 * Get all neighbors of a reflection
 * 
 * @param index - Structural neighborhood index
 * @param reflectionId - Reflection ID
 * @returns Array of neighbor IDs (unordered)
 */
export function getNeighbors(
  index: StructuralNeighborhoodIndex,
  reflectionId: string
): string[] {
  const neighborhood = getNeighborhood(index, reflectionId);
  return neighborhood ? [...neighborhood.neighborIds] : [];
}

