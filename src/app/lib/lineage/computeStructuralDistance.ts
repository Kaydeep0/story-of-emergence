/**
 * Structural Distance Metric
 * 
 * Measures how far apart reflections are in structural space without
 * using semantics, similarity, meaning, or narrative interpretation.
 * 
 * This enables relative position without hierarchy.
 * 
 * Requirements:
 * - Distance is structural only: computed from lineage graph topology and structural divergence patterns
 * - Metric properties: deterministic, symmetric, non-negative
 * - No inference impact: does not influence emergence, novelty, decay, saturation, regime, dwell time
 * - Session scoped: computed per wallet session
 * - Encrypted at rest: distances stored encrypted client-side
 * - No semantics or ranking: no "closer is better", no thresholds, no clustering logic
 * - UI inaccessible: no visualization, no exposure, exists only as internal data structure
 */

import type { StructuralLineageGraph } from './buildStructuralLineage';

export type StructuralDistanceMatrix = {
  distances: Record<string, Record<string, number>>; // reflectionId -> reflectionId -> distance
  sessionId: string;
  createdAt: string; // ISO timestamp
};

export type DistanceSignals = {
  lineageGraph: StructuralLineageGraph;
  sessionId: string;
};

/**
 * Compute structural distance matrix from lineage graph
 * 
 * Distance is computed from:
 * - Lineage graph topology (shortest path length)
 * - Structural divergence patterns (accumulated divergence along path)
 * 
 * Metric properties:
 * - Deterministic: same lineage graph → same distances
 * - Symmetric: distance(A, B) = distance(B, A)
 * - Non-negative: all distances >= 0
 * 
 * @param signals - Distance computation signals
 * @returns StructuralDistanceMatrix
 */
export function computeStructuralDistance(signals: DistanceSignals): StructuralDistanceMatrix {
  const { lineageGraph, sessionId } = signals;

  const { reflections, links } = lineageGraph;

  if (reflections.length === 0) {
    return {
      distances: {},
      sessionId,
      createdAt: new Date().toISOString(),
    };
  }

  // Build adjacency map: reflectionId -> { neighborId -> divergence }
  const adjacencyMap = new Map<string, Map<string, number>>();
  
  // Initialize adjacency map for all reflections
  reflections.forEach((id) => {
    adjacencyMap.set(id, new Map());
  });

  // Add edges from links
  links.forEach((link) => {
    const fromMap = adjacencyMap.get(link.fromReflectionId);
    const toMap = adjacencyMap.get(link.toReflectionId);
    
    if (fromMap && toMap) {
      // Add bidirectional edges (symmetric)
      fromMap.set(link.toReflectionId, link.divergence);
      toMap.set(link.fromReflectionId, link.divergence);
    }
  });

  // Compute shortest path distances using Dijkstra's algorithm
  // Distance is accumulated divergence along shortest path
  const distances: Record<string, Record<string, number>> = {};

  reflections.forEach((startId) => {
    distances[startId] = {};
    
    // Dijkstra's algorithm to find shortest paths from startId
    const dist = new Map<string, number>();
    const visited = new Set<string>();
    
    // Initialize distances
    reflections.forEach((id) => {
      dist.set(id, id === startId ? 0 : Infinity);
    });

    // Process all nodes
    while (visited.size < reflections.length) {
      // Find unvisited node with minimum distance
      let minId: string | null = null;
      let minDist = Infinity;
      
      for (const id of reflections) {
        if (!visited.has(id)) {
          const d = dist.get(id)!;
          if (d < minDist) {
            minDist = d;
            minId = id;
          }
        }
      }

      if (minId === null) break;

      visited.add(minId);
      const currentDist = dist.get(minId)!;

      // Update distances to neighbors
      const neighbors = adjacencyMap.get(minId);
      if (neighbors) {
        neighbors.forEach((divergence, neighborId) => {
          if (!visited.has(neighborId)) {
            const newDist = currentDist + divergence;
            const oldDist = dist.get(neighborId)!;
            if (newDist < oldDist) {
              dist.set(neighborId, newDist);
            }
          }
        });
      }
    }

    // Store distances
    for (const endId of reflections) {
      const d = dist.get(endId)!;
      distances[startId][endId] = d === Infinity ? Infinity : d;
    }
  });

  // Ensure symmetry: distance(A, B) = distance(B, A)
  for (let i = 0; i < reflections.length; i++) {
    const id1 = reflections[i];
    for (let j = 0; j < reflections.length; j++) {
      const id2 = reflections[j];
      if (id1 !== id2) {
        const d1 = distances[id1]?.[id2] ?? Infinity;
        const d2 = distances[id2]?.[id1] ?? Infinity;
        // Use average to ensure symmetry
        const symmetricDist = (d1 + d2) / 2;
        if (!distances[id1]) distances[id1] = {};
        if (!distances[id2]) distances[id2] = {};
        distances[id1][id2] = symmetricDist;
        distances[id2][id1] = symmetricDist;
      } else {
        // Self-distance is 0
        if (!distances[id1]) distances[id1] = {};
        distances[id1][id2] = 0;
      }
    }
  }

  return {
    distances,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get structural distance between two reflections
 * 
 * @param distanceMatrix - Structural distance matrix
 * @param reflectionId1 - First reflection ID
 * @param reflectionId2 - Second reflection ID
 * @returns Structural distance (0 if same reflection, Infinity if not found)
 */
export function getStructuralDistance(
  distanceMatrix: StructuralDistanceMatrix,
  reflectionId1: string,
  reflectionId2: string
): number {
  if (reflectionId1 === reflectionId2) {
    return 0; // Same reflection
  }

  const dist = distanceMatrix.distances[reflectionId1]?.[reflectionId2];
  return dist !== undefined ? dist : Infinity;
}

/**
 * Get all distances from a reflection
 * 
 * @param distanceMatrix - Structural distance matrix
 * @param reflectionId - Reflection ID
 * @returns Map of reflection ID -> distance
 */
export function getDistancesFromReflection(
  distanceMatrix: StructuralDistanceMatrix,
  reflectionId: string
): Record<string, number> {
  return distanceMatrix.distances[reflectionId] || {};
}
