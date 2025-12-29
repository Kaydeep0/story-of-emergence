/**
 * Encrypt Structural Neighborhood Index
 * 
 * Encrypts the structural neighborhood index client-side before storage.
 * Server never sees neighborhood data.
 */

import type { StructuralNeighborhoodIndex } from './buildNeighborhoodIndex';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedNeighborhoodIndex = EncryptedRelationshipPayload;

/**
 * Encrypt structural neighborhood index
 * 
 * @param index - Structural neighborhood index to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted neighborhood index
 */
export async function encryptNeighborhoodIndex(
  index: StructuralNeighborhoodIndex,
  key: CryptoKey
): Promise<EncryptedNeighborhoodIndex> {
  // Convert StructuralNeighborhoodIndex to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  
  // Store neighborhoods as nodes and edges
  const nodes = index.neighborhoods.map((neighborhood) => ({
    id: `reflection_${neighborhood.reflectionId}`,
    type: 'reflection' as const,
    reflectionId: neighborhood.reflectionId,
    createdAt: now,
  }));

  const edges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    edgeType: string;
    weight?: number;
    createdAt: string;
  }> = [];

  let edgeIndex = 0;
  index.neighborhoods.forEach((neighborhood) => {
    neighborhood.neighborIds.forEach((neighborId) => {
      // Only store one direction (symmetry is implicit)
      if (neighborhood.reflectionId < neighborId) {
        edges.push({
          id: `neighbor_${edgeIndex++}`,
          fromNodeId: `reflection_${neighborhood.reflectionId}`,
          toNodeId: `reflection_${neighborId}`,
          edgeType: 'structural_neighbor',
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
 * Decrypt structural neighborhood index
 * 
 * @param encrypted - Encrypted neighborhood index
 * @param key - AES-GCM decryption key
 * @returns Decrypted structural neighborhood index
 */
export async function decryptNeighborhoodIndex(
  encrypted: EncryptedNeighborhoodIndex,
  key: CryptoKey
): Promise<StructuralNeighborhoodIndex> {
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);

  // Reconstruct neighborhood index from graph
  const neighborhoods: Array<{ reflectionId: string; neighborIds: string[] }> = [];
  const reflectionIds = new Set<string>();

  // Extract reflection IDs from nodes
  relationshipGraph.nodes.forEach((node) => {
    if (node.type === 'reflection') {
      const reflectionId = (node as any).reflectionId || node.id.replace('reflection_', '');
      reflectionIds.add(reflectionId);
    }
  });

  // Initialize neighborhoods
  reflectionIds.forEach((id) => {
    neighborhoods.push({
      reflectionId: id,
      neighborIds: [],
    });
  });

  // Extract neighborhoods from edges (restore symmetry)
  relationshipGraph.edges.forEach((edge) => {
    if (edge.edgeType === 'structural_neighbor') {
      const fromId = edge.fromNodeId.replace('reflection_', '');
      const toId = edge.toNodeId.replace('reflection_', '');
      
      const fromNeighborhood = neighborhoods.find(n => n.reflectionId === fromId);
      const toNeighborhood = neighborhoods.find(n => n.reflectionId === toId);
      
      if (fromNeighborhood && !fromNeighborhood.neighborIds.includes(toId)) {
        fromNeighborhood.neighborIds.push(toId);
      }
      if (toNeighborhood && !toNeighborhood.neighborIds.includes(fromId)) {
        toNeighborhood.neighborIds.push(fromId);
      }
    }
  });

  // Extract distanceThreshold and sessionId from stored metadata if available
  // For now, use defaults
  const DEFAULT_DISTANCE_THRESHOLD = 0.5;
  return {
    neighborhoods,
    distanceThreshold: DEFAULT_DISTANCE_THRESHOLD, // Fallback - should be stored separately
    sessionId: `session_${Date.now()}`, // Fallback - should be stored separately
    createdAt: new Date().toISOString(), // Fallback - should be stored separately
  };
}

