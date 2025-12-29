/**
 * Encrypt Structural Density Gradient
 * 
 * Encrypts the structural density gradient client-side before storage.
 * Server never sees gradient data.
 */

import type { StructuralDensityGradient } from './computeDensityGradient';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedDensityGradient = EncryptedRelationshipPayload;

/**
 * Encrypt structural density gradient
 * 
 * @param gradient - Structural density gradient to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted density gradient
 */
export async function encryptDensityGradient(
  gradient: StructuralDensityGradient,
  key: CryptoKey
): Promise<EncryptedDensityGradient> {
  // Convert StructuralDensityGradient to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  
  // Store gradients as nodes with metadata
  const nodes = gradient.gradients.map((grad) => ({
    id: `reflection_${grad.reflectionId}`,
    type: 'reflection' as const,
    reflectionId: grad.reflectionId,
    createdAt: now,
    metadata: {
      gradientMagnitude: grad.gradientMagnitude,
    },
  }));

  const relationshipGraph = {
    nodes,
    edges: [], // No edges needed for gradient
  };

  return await encryptRelationshipGraph(key, relationshipGraph);
}

/**
 * Decrypt structural density gradient
 * 
 * @param encrypted - Encrypted density gradient
 * @param key - AES-GCM decryption key
 * @returns Decrypted structural density gradient
 */
export async function decryptDensityGradient(
  encrypted: EncryptedDensityGradient,
  key: CryptoKey
): Promise<StructuralDensityGradient> {
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);

  // Reconstruct gradient from graph
  const gradients: Array<{ reflectionId: string; gradientMagnitude: number }> = [];

  relationshipGraph.nodes.forEach((node) => {
    if (node.type === 'reflection') {
      const reflectionId = (node as any).reflectionId || node.id.replace('reflection_', '');
      const metadata = (node as any).metadata || {};
      const gradientMagnitude = metadata.gradientMagnitude || 0;
      
      gradients.push({
        reflectionId,
        gradientMagnitude,
      });
    }
  });

  // Extract sessionId and createdAt from stored metadata if available
  // For now, use defaults
  return {
    gradients,
    sessionId: `session_${Date.now()}`, // Fallback - should be stored separately
    createdAt: new Date().toISOString(), // Fallback - should be stored separately
  };
}

