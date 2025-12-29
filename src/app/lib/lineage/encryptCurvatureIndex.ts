/**
 * Encrypt Structural Curvature Index
 * 
 * Encrypts the structural curvature index client-side before storage.
 * Server never sees curvature data.
 */

import type { StructuralCurvatureIndex } from './computeStructuralCurvature';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedCurvatureIndex = EncryptedRelationshipPayload;

/**
 * Encrypt structural curvature index
 * 
 * @param curvatureIndex - Structural curvature index to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted curvature index
 */
export async function encryptCurvatureIndex(
  curvatureIndex: StructuralCurvatureIndex,
  key: CryptoKey
): Promise<EncryptedCurvatureIndex> {
  // Convert StructuralCurvatureIndex to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  
  // Store curvatures as nodes with metadata
  const nodes = curvatureIndex.curvatures.map((curvature) => ({
    id: `reflection_${curvature.reflectionId}`,
    type: 'reflection' as const,
    reflectionId: curvature.reflectionId,
    createdAt: now,
    metadata: {
      curvatureMagnitude: curvature.curvatureMagnitude,
    },
  }));

  const relationshipGraph = {
    nodes,
    edges: [], // No edges needed for curvature index
  };

  return await encryptRelationshipGraph(key, relationshipGraph);
}

/**
 * Decrypt structural curvature index
 * 
 * @param encrypted - Encrypted curvature index
 * @param key - AES-GCM decryption key
 * @returns Decrypted structural curvature index
 */
export async function decryptCurvatureIndex(
  encrypted: EncryptedCurvatureIndex,
  key: CryptoKey
): Promise<StructuralCurvatureIndex> {
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);

  // Reconstruct curvature index from graph
  const curvatures: Array<{ reflectionId: string; curvatureMagnitude: number }> = [];

  relationshipGraph.nodes.forEach((node) => {
    if (node.type === 'reflection') {
      const reflectionId = (node as any).reflectionId || node.id.replace('reflection_', '');
      const metadata = (node as any).metadata || {};
      const curvatureMagnitude = metadata.curvatureMagnitude || 0;
      
      curvatures.push({
        reflectionId,
        curvatureMagnitude,
      });
    }
  });

  // Extract sessionId and createdAt from stored metadata if available
  // For now, use defaults
  return {
    curvatures,
    sessionId: `session_${Date.now()}`, // Fallback - should be stored separately
    createdAt: new Date().toISOString(), // Fallback - should be stored separately
  };
}

