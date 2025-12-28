// src/app/lib/relationships/types.ts
// TypeScript types for relationship nodes and edges

/**
 * Node types that can participate in relationships
 */
export type RelationshipNodeType = 'reflection' | 'source' | 'tag' | 'reflection_reflection';

/**
 * Base relationship node structure
 */
export type RelationshipNode = {
  id: string;
  type: RelationshipNodeType;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  deletedAt?: string | null; // ISO string
};

/**
 * Reflection node (links to reflection entries)
 */
export type ReflectionNode = RelationshipNode & {
  type: 'reflection';
  reflectionId: string; // ID of the reflection entry
};

/**
 * Source node (links to source entries)
 */
export type SourceNode = RelationshipNode & {
  type: 'source';
  sourceId: string; // ID of the source entry
};

/**
 * Tag node (user-defined tags)
 */
export type TagNode = RelationshipNode & {
  type: 'tag';
  tagName: string; // The tag name/label
};

/**
 * Reflection-to-reflection node (for linking reflections directly)
 */
export type ReflectionReflectionNode = RelationshipNode & {
  type: 'reflection_reflection';
  reflectionId: string; // ID of the reflection entry
};

/**
 * Union type for all node types
 */
export type AnyRelationshipNode = ReflectionNode | SourceNode | TagNode | ReflectionReflectionNode;

/**
 * Relationship edge connecting two nodes
 */
export type RelationshipEdge = {
  id: string;
  fromNodeId: string; // ID of the source node
  toNodeId: string; // ID of the target node
  edgeType?: string; // Optional edge type/label (e.g., "related_to", "inspired_by", "tagged_with")
  weight?: number; // Optional weight/strength of the relationship
  metadata?: Record<string, unknown>; // Optional additional metadata
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  deletedAt?: string | null; // ISO string
};

/**
 * Complete relationship graph structure
 */
export type RelationshipGraph = {
  nodes: AnyRelationshipNode[];
  edges: RelationshipEdge[];
};

/**
 * Encrypted relationship payload (what gets stored)
 */
export type EncryptedRelationshipPayload = {
  ciphertext: string; // Encrypted JSON string of RelationshipGraph
};

