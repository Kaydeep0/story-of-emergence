/**
 * Encrypt Structural Density Map
 * 
 * Encrypts the structural density map client-side before storage.
 * Server never sees density data.
 */

import type { StructuralDensityMap } from './computeStructuralDensity';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedDensityMap = EncryptedRelationshipPayload;

/**
 * Encrypt structural density map
 * 
 * @param densityMap - Structural density map to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted density map
 */
export async function encryptDensityMap(
  densityMap: StructuralDensityMap,
  key: CryptoKey
): Promise<EncryptedDensityMap> {
  // Convert StructuralDensityMap to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  
  // Store densities as nodes with metadata
  const nodes = densityMap.densities.map((density) => ({
    id: `reflection_${density.reflectionId}`,
    type: 'reflection' as const,
    reflectionId: density.reflectionId,
    createdAt: now,
    metadata: {
      density: density.density,
    },
  }));

  const relationshipGraph = {
    nodes,
    edges: [], // No edges needed for density map
  };

  return await encryptRelationshipGraph(key, relationshipGraph);
}

/**
 * Decrypt structural density map
 * 
 * @param encrypted - Encrypted density map
 * @param key - AES-GCM decryption key
 * @returns Decrypted structural density map
 */
export async function decryptDensityMap(
  encrypted: EncryptedDensityMap,
  key: CryptoKey
): Promise<StructuralDensityMap> {
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);

  // Reconstruct density map from graph
  const densities: Array<{ reflectionId: string; density: number }> = [];

  relationshipGraph.nodes.forEach((node) => {
    if (node.type === 'reflection') {
      const reflectionId = (node as any).reflectionId || node.id.replace('reflection_', '');
      const metadata = (node as any).metadata || {};
      const density = metadata.density || 0;
      
      densities.push({
        reflectionId,
        density,
      });
    }
  });

  // Extract sessionId and createdAt from stored metadata if available
  // For now, use defaults
  return {
    densities,
    sessionId: `session_${Date.now()}`, // Fallback - should be stored separately
    createdAt: new Date().toISOString(), // Fallback - should be stored separately
  };
}

