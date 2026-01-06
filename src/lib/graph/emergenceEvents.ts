// src/lib/graph/emergenceEvents.ts
// Emergence event detection for graph evolution
// Layer 1: Signal layer - computable metrics only

import type { Edge } from './buildReflectionGraph';

export type EmergenceEventType = 
  | 'NODE_BIRTH'
  | 'CLUSTER_FORMATION'
  | 'CLUSTER_MERGE'
  | 'CONNECTIVITY_SPIKE';

export interface NodeBirthEvent {
  type: 'NODE_BIRTH';
  nodeId: string;
  createdAt: string;
}

export interface ClusterFormationEvent {
  type: 'CLUSTER_FORMATION';
  clusterId: number;
  size: number;
  memberIds: string[];
}

export interface ClusterMergeEvent {
  type: 'CLUSTER_MERGE';
  fromClusterIds: number[];
  toClusterId: number;
  sizeChange: number;
  memberIds: string[];
}

export interface ConnectivitySpikeEvent {
  type: 'CONNECTIVITY_SPIKE';
  nodeId: string;
  prevDegree: number;
  nextDegree: number;
  delta: number;
}

export type EmergenceEvent =
  | NodeBirthEvent
  | ClusterFormationEvent
  | ClusterMergeEvent
  | ConnectivitySpikeEvent;

export interface GraphState {
  nodes: Array<{ id: string; createdAt: string }>;
  links: Array<{ source: string; target: string; weight: number }>;
  clusters: Map<string, number>; // nodeId -> clusterId
}

/**
 * Compute weighted degree for a node (undirected)
 */
function computeWeightedDegree(
  nodeId: string,
  links: Array<{ source: string | { id: string }; target: string | { id: string }; weight: number }>
): number {
  let sum = 0;
  for (const link of links) {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    if (sourceId === nodeId || targetId === nodeId) {
      sum += (link.weight || 0);
    }
  }
  return sum;
}

/**
 * Get cluster members from cluster map
 */
function getClusterMembers(
  clusterId: number,
  clusters: Map<string, number>
): string[] {
  const members: string[] = [];
  clusters.forEach((cid, nodeId) => {
    if (cid === clusterId) {
      members.push(nodeId);
    }
  });
  return members;
}

/**
 * Detect emergence events between two graph states
 */
export function detectEmergenceEvents(
  priorGraph: GraphState | null,
  nextGraph: GraphState
): EmergenceEvent[] {
  const events: EmergenceEvent[] = [];

  if (!priorGraph) {
    // First state: all nodes are births
    nextGraph.nodes.forEach(node => {
      events.push({
        type: 'NODE_BIRTH',
        nodeId: node.id,
        createdAt: node.createdAt,
      });
    });
    return events;
  }

  // 1. Detect node births
  const priorNodeIds = new Set(priorGraph.nodes.map(n => n.id));
  const nextNodeIds = new Set(nextGraph.nodes.map(n => n.id));
  
  nextGraph.nodes.forEach(node => {
    if (!priorNodeIds.has(node.id)) {
      events.push({
        type: 'NODE_BIRTH',
        nodeId: node.id,
        createdAt: node.createdAt,
      });
    }
  });

  // 2. Detect connectivity spikes
  const priorDegrees = new Map<string, number>();
  priorGraph.nodes.forEach(node => {
    priorDegrees.set(node.id, computeWeightedDegree(node.id, priorGraph.links));
  });

  nextGraph.nodes.forEach(node => {
    if (priorNodeIds.has(node.id)) {
      const prevDegree = priorDegrees.get(node.id) || 0;
      const nextDegree = computeWeightedDegree(node.id, nextGraph.links);
      const delta = nextDegree - prevDegree;
      
      // Spike if delta >= 1.2 and nextDegree >= 2.0
      if (delta >= 1.2 && nextDegree >= 2.0) {
        events.push({
          type: 'CONNECTIVITY_SPIKE',
          nodeId: node.id,
          prevDegree,
          nextDegree,
          delta,
        });
      }
    }
  });

  // 3. Detect cluster formations and merges
  const priorClusters = new Map<number, Set<string>>();
  priorGraph.clusters.forEach((clusterId, nodeId) => {
    if (!priorClusters.has(clusterId)) {
      priorClusters.set(clusterId, new Set());
    }
    priorClusters.get(clusterId)!.add(nodeId);
  });

  const nextClusters = new Map<number, Set<string>>();
  nextGraph.clusters.forEach((clusterId, nodeId) => {
    if (!nextClusters.has(clusterId)) {
      nextClusters.set(clusterId, new Set());
    }
    nextClusters.get(clusterId)!.add(nodeId);
  });

  // Find cluster formations (new clusters with size >= 3)
  nextClusters.forEach((members, clusterId) => {
    if (members.size >= 3) {
      // Check if this is a new cluster
      let isNew = true;
      let mergedFrom: number[] = [];

      priorClusters.forEach((priorMembers, priorClusterId) => {
        // Check if any prior cluster overlaps significantly with this one
        const overlap = Array.from(priorMembers).filter(id => members.has(id));
        if (overlap.length > 0) {
          isNew = false;
          // Check if this is a merge (multiple prior clusters contribute)
          if (overlap.length < priorMembers.size) {
            // Partial overlap suggests merge
            mergedFrom.push(priorClusterId);
          }
        }
      });

      if (isNew) {
        // New cluster formation
        events.push({
          type: 'CLUSTER_FORMATION',
          clusterId,
          size: members.size,
          memberIds: Array.from(members),
        });
      } else if (mergedFrom.length > 1) {
        // Cluster merge (multiple prior clusters merged into one)
        const totalPriorSize = mergedFrom.reduce((sum, id) => {
          return sum + (priorClusters.get(id)?.size || 0);
        }, 0);
        const sizeChange = members.size - totalPriorSize;

        events.push({
          type: 'CLUSTER_MERGE',
          fromClusterIds: mergedFrom,
          toClusterId: clusterId,
          sizeChange,
          memberIds: Array.from(members),
        });
      }
    }
  });

  // Sort events by type priority and timestamp
  const typePriority: Record<EmergenceEventType, number> = {
    NODE_BIRTH: 1,
    CLUSTER_FORMATION: 2,
    CLUSTER_MERGE: 3,
    CONNECTIVITY_SPIKE: 4,
  };

  events.sort((a, b) => {
    const priorityDiff = typePriority[a.type] - typePriority[b.type];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Within same type, sort by timestamp or size
    if (a.type === 'NODE_BIRTH' && b.type === 'NODE_BIRTH') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (a.type === 'CLUSTER_FORMATION' && b.type === 'CLUSTER_FORMATION') {
      return b.size - a.size; // Larger clusters first
    }
    if (a.type === 'CONNECTIVITY_SPIKE' && b.type === 'CONNECTIVITY_SPIKE') {
      return b.delta - a.delta; // Larger spikes first
    }
    return 0;
  });

  return events;
}

