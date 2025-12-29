/**
 * Encrypt Structural Lineage Graph
 * 
 * Encrypts the structural lineage graph client-side before storage.
 * Server never sees graph structure.
 */

import type { StructuralLineageGraph } from './buildStructuralLineage';
import { encryptRelationshipGraph, decryptRelationshipGraph } from '../relationships/encryption';
import type { EncryptedRelationshipPayload } from '../relationships/types';

export type EncryptedLineageGraph = EncryptedRelationshipPayload;

/**
 * Encrypt structural lineage graph
 * 
 * @param graph - Structural lineage graph to encrypt
 * @param key - AES-GCM encryption key
 * @returns Encrypted lineage graph
 */
export async function encryptLineageGraph(
  graph: StructuralLineageGraph,
  key: CryptoKey
): Promise<EncryptedLineageGraph> {
  // Use the relationship graph encryption function
  // Convert StructuralLineageGraph to RelationshipGraph format for encryption
  const now = new Date().toISOString();
  const relationshipGraph = {
    nodes: graph.reflections.map(id => ({
      id: `reflection_${id}`,
      type: 'reflection' as const,
      reflectionId: id,
      createdAt: now,
    })),
    edges: graph.links.map((link, index) => ({
      id: `link_${index}`,
      fromNodeId: `reflection_${link.fromReflectionId}`,
      toNodeId: `reflection_${link.toReflectionId}`,
      edgeType: 'structural_divergence',
      weight: link.divergence,
      createdAt: now,
    })),
  };
  
  return await encryptRelationshipGraph(key, relationshipGraph);
}

/**
 * Decrypt structural lineage graph
 * 
 * @param encrypted - Encrypted lineage graph
 * @param key - AES-GCM decryption key
 * @returns Decrypted structural lineage graph
 */
export async function decryptLineageGraph(
  encrypted: EncryptedLineageGraph,
  key: CryptoKey
): Promise<StructuralLineageGraph> {
  // Use the relationship graph decryption function
  const relationshipGraph = await decryptRelationshipGraph(key, encrypted);
  
  // Convert RelationshipGraph back to StructuralLineageGraph format
  const reflections = relationshipGraph.nodes
    .filter(node => node.type === 'reflection')
    .map(node => (node as any).reflectionId || node.id.replace('reflection_', ''));
  
  const links = relationshipGraph.edges
    .filter(edge => edge.edgeType === 'structural_divergence')
    .map(edge => ({
      fromReflectionId: edge.fromNodeId.replace('reflection_', ''),
      toReflectionId: edge.toNodeId.replace('reflection_', ''),
      divergence: edge.weight || 0,
    }));
  
  // Reconstruct sessionId and createdAt from stored metadata if available
  // For now, use current time as fallback
  return {
    reflections,
    links,
    sessionId: `session_${Date.now()}`, // Fallback - should be stored separately
    createdAt: new Date().toISOString(), // Fallback - should be stored separately
  };
}

