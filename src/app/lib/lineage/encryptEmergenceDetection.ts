/**
 * Encrypt Emergence Boundary Detection
 * 
 * Encrypts the emergence boundary detection result client-side before storage.
 * Server never sees emergence state.
 */

import type { EmergenceBoundaryState } from './detectEmergenceBoundary';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedEmergenceDetection = EncryptedRelationshipPayload;

/**
 * Encrypt emergence boundary detection result
 * 
 * @param detection - Emergence boundary detection result to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted emergence detection
 */
export async function encryptEmergenceDetection(
  detection: EmergenceBoundaryState,
  key: CryptoKey
): Promise<EncryptedEmergenceDetection> {
  // Convert EmergenceBoundaryState to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  
  // Store detection as a reflection node with metadata (using valid node type)
  const relationshipGraph = {
    nodes: [{
      id: 'emergence_detection',
      type: 'reflection' as const,
      reflectionId: 'emergence_detection',
      createdAt: now,
      metadata: {
        isEmergent: detection.isEmergent,
        sessionId: detection.sessionId,
        createdAt: detection.createdAt,
      },
    }],
    edges: [], // No edges needed for detection
  };

  return await encryptRelationshipGraph(key, relationshipGraph);
}

/**
 * Decrypt emergence boundary detection result
 * 
 * @param encrypted - Encrypted emergence detection
 * @param key - AES-GCM decryption key
 * @returns Decrypted emergence boundary detection result
 */
export async function decryptEmergenceDetection(
  encrypted: EncryptedEmergenceDetection,
  key: CryptoKey
): Promise<EmergenceBoundaryState> {
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);

  // Reconstruct detection from graph
  const detectionNode = relationshipGraph.nodes.find(n => n.id === 'emergence_detection');
  
  if (!detectionNode) {
    throw new Error('Emergence detection node not found in decrypted graph');
  }

  const metadata = (detectionNode as any).metadata || {};
  
  return {
    isEmergent: metadata.isEmergent || false,
    sessionId: metadata.sessionId || `session_${Date.now()}`,
    createdAt: metadata.createdAt || new Date().toISOString(),
  };
}

