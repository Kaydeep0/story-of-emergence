/**
 * Encrypt Structural Distance Matrix
 * 
 * Encrypts the structural distance matrix client-side before storage.
 * Server never sees distance data.
 */

import type { StructuralDistanceMatrix } from './computeStructuralDistance';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedDistanceMatrix = EncryptedRelationshipPayload;

/**
 * Encrypt structural distance matrix
 * 
 * @param distanceMatrix - Structural distance matrix to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted distance matrix
 */
export async function encryptDistanceMatrix(
  distanceMatrix: StructuralDistanceMatrix,
  key: CryptoKey
): Promise<EncryptedDistanceMatrix> {
  // Convert StructuralDistanceMatrix to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  
  // Store distances as edges in a graph structure
  const nodes = Object.keys(distanceMatrix.distances).map(id => ({
    id: `reflection_${id}`,
    type: 'reflection' as const,
    reflectionId: id,
    createdAt: now,
  }));

  const edges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    edgeType: string;
    weight: number;
    createdAt: string;
  }> = [];

  let edgeIndex = 0;
  Object.entries(distanceMatrix.distances).forEach(([fromId, toDistances]) => {
    Object.entries(toDistances).forEach(([toId, distance]) => {
      if (fromId !== toId && distance !== Infinity && distance > 0) {
        edges.push({
          id: `distance_${edgeIndex++}`,
          fromNodeId: `reflection_${fromId}`,
          toNodeId: `reflection_${toId}`,
          edgeType: 'structural_distance',
          weight: distance,
          createdAt: now,
        });
      }
    });
  });

  const relationshipGraph = {
    nodes,
    edges,
  };

  return await encryptRelationshipGraph(key, relationshipGraph);
}

/**
 * Decrypt structural distance matrix
 * 
 * @param encrypted - Encrypted distance matrix
 * @param key - AES-GCM decryption key
 * @returns Decrypted structural distance matrix
 */
export async function decryptDistanceMatrix(
  encrypted: EncryptedDistanceMatrix,
  key: CryptoKey
): Promise<StructuralDistanceMatrix> {
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);

  // Reconstruct distance matrix from graph
  const distances: Record<string, Record<string, number>> = {};
  const reflectionIds = new Set<string>();

  // Extract reflection IDs from nodes
  relationshipGraph.nodes.forEach(node => {
    if (node.type === 'reflection') {
      const reflectionId = (node as any).reflectionId || node.id.replace('reflection_', '');
      reflectionIds.add(reflectionId);
      distances[reflectionId] = {};
    }
  });

  // Initialize all distances to 0 (self-distance) or Infinity
  reflectionIds.forEach(id1 => {
    reflectionIds.forEach(id2 => {
      if (id1 === id2) {
        distances[id1][id2] = 0;
      } else {
        distances[id1][id2] = Infinity;
      }
    });
  });

  // Extract distances from edges
  relationshipGraph.edges.forEach(edge => {
    if (edge.edgeType === 'structural_distance') {
      const fromId = edge.fromNodeId.replace('reflection_', '');
      const toId = edge.toNodeId.replace('reflection_', '');
      const distance = edge.weight || 0;
      
      if (distances[fromId] && distances[toId]) {
        distances[fromId][toId] = distance;
        distances[toId][fromId] = distance; // Ensure symmetry
      }
    }
  });

  // Extract sessionId and createdAt from stored metadata if available
  // For now, use current time as fallback
  return {
    distances,
    sessionId: `session_${Date.now()}`, // Fallback - should be stored separately
    createdAt: new Date().toISOString(), // Fallback - should be stored separately
  };
}

