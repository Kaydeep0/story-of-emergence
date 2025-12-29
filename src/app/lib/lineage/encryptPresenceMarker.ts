/**
 * Encrypt Emergence Presence Marker
 * 
 * Encrypts the emergence presence marker client-side before storage.
 * Server never sees presence state.
 */

import type { EmergencePresenceMarker } from './markEmergencePresence';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedPresenceMarker = EncryptedRelationshipPayload;

/**
 * Encrypt emergence presence marker
 * 
 * @param marker - Emergence presence marker to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted presence marker
 */
export async function encryptPresenceMarker(
  marker: EmergencePresenceMarker,
  key: CryptoKey
): Promise<EncryptedPresenceMarker> {
  // Convert EmergencePresenceMarker to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  
  // Store marker as a reflection node with metadata (using valid node type)
  const relationshipGraph = {
    nodes: [{
      id: 'emergence_presence',
      type: 'reflection' as const,
      reflectionId: 'emergence_presence',
      createdAt: now,
      metadata: {
        isPresent: marker.isPresent,
        sessionId: marker.sessionId,
        createdAt: marker.createdAt,
      },
    }],
    edges: [], // No edges needed for marker
  };

  return await encryptRelationshipGraph(key, relationshipGraph);
}

/**
 * Decrypt emergence presence marker
 * 
 * @param encrypted - Encrypted presence marker
 * @param key - AES-GCM decryption key
 * @returns Decrypted emergence presence marker
 */
export async function decryptPresenceMarker(
  encrypted: EncryptedPresenceMarker,
  key: CryptoKey
): Promise<EmergencePresenceMarker> {
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);

  // Reconstruct marker from graph
  const markerNode = relationshipGraph.nodes.find(n => n.id === 'emergence_presence');
  
  if (!markerNode) {
    throw new Error('Emergence presence marker node not found in decrypted graph');
  }

  const metadata = (markerNode as any).metadata || {};
  
  return {
    isPresent: metadata.isPresent || false,
    sessionId: metadata.sessionId || `session_${Date.now()}`,
    createdAt: metadata.createdAt || new Date().toISOString(),
  };
}

