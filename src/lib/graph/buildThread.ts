// src/lib/graph/buildThread.ts
// Thread construction from cluster nodes and edges
// Layer 1: Signal layer - computable metrics only

import type { Edge } from './buildReflectionGraph';
import type { ReflectionEntry } from '../../app/lib/insights/types';

export interface ThreadNode {
  reflection: ReflectionEntry;
  connectionStrength: number; // Weight to previous node (0 if first)
  connectionReason: string[]; // Reasons from edge (lexical, time, etc.)
}

export interface KeyBridge {
  from: ReflectionEntry;
  to: ReflectionEntry;
  weight: number;
  reasons: string[];
}

export interface ThreadResult {
  nodes: ThreadNode[];
  keyBridges: KeyBridge[];
  clusterSize: number;
  timeRange: { earliest: Date; latest: Date };
}

/**
 * Build a narrative thread from cluster nodes and edges
 * 
 * Strategy:
 * 1. Sort reflections by createdAt ascending (base timeline)
 * 2. Build thread path emphasizing strong connectivity:
 *    - Start with earliest reflection
 *    - For each step, pick next reflection that is:
 *      - Later in time
 *      - Has highest edge weight to current
 *      - Falls back to chronological if no connection
 * 3. Compute key bridges (top 5 edges by weight)
 */
export function buildThread(
  reflections: ReflectionEntry[],
  edges: Edge[],
  clusterId: number,
  nodeToCluster: Map<string, number>
): ThreadResult {
  // Filter to cluster nodes only
  const clusterNodes = reflections.filter(r => nodeToCluster.get(r.id) === clusterId);
  
  if (clusterNodes.length === 0) {
    return {
      nodes: [],
      keyBridges: [],
      clusterSize: 0,
      timeRange: { earliest: new Date(), latest: new Date() },
    };
  }

  // Sort by createdAt ascending
  const sortedByTime = [...clusterNodes].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Build edge map for quick lookup
  const edgeMap = new Map<string, Map<string, Edge>>();
  edges.forEach(edge => {
    // Only include edges within cluster
    const fromCluster = nodeToCluster.get(edge.from);
    const toCluster = nodeToCluster.get(edge.to);
    if (fromCluster === clusterId && toCluster === clusterId) {
      if (!edgeMap.has(edge.from)) {
        edgeMap.set(edge.from, new Map());
      }
      edgeMap.get(edge.from)!.set(edge.to, edge);
      
      // Also add reverse (undirected)
      if (!edgeMap.has(edge.to)) {
        edgeMap.set(edge.to, new Map());
      }
      edgeMap.get(edge.to)!.set(edge.from, edge);
    }
  });

  // Build thread path
  const threadNodes: ThreadNode[] = [];
  const used = new Set<string>();
  
  // Start with earliest reflection
  let current = sortedByTime[0];
  used.add(current.id);
  threadNodes.push({
    reflection: current,
    connectionStrength: 0,
    connectionReason: [],
  });

  // Build path greedily by connectivity
  while (threadNodes.length < sortedByTime.length) {
    const currentId = current.id;
    const currentTime = new Date(current.createdAt).getTime();
    
    // Find best next node: later in time, highest weight connection
    let bestNext: ReflectionEntry | null = null;
    let bestWeight = 0;
    let bestEdgeReasons: string[] = [];
    
    const connections = edgeMap.get(currentId);
    if (connections) {
      connections.forEach((edge, targetId) => {
        if (used.has(targetId)) return;
        
        const target = sortedByTime.find(r => r.id === targetId);
        if (!target) return;
        
        const targetTime = new Date(target.createdAt).getTime();
        if (targetTime <= currentTime) return; // Must be later
        
        if (edge.weight > bestWeight) {
          bestWeight = edge.weight;
          bestNext = target;
          bestEdgeReasons = edge.reasons || [];
        }
      });
    }
    
    // If no connected node found, fall back to chronological
    if (!bestNext) {
      bestNext = sortedByTime.find(r => !used.has(r.id) && new Date(r.createdAt).getTime() > currentTime) ?? 
                 sortedByTime.find(r => !used.has(r.id)) ??
                 null;
      // Reset reasons when falling back to chronological
      if (bestNext) {
        bestEdgeReasons = [];
      }
    }
    
    if (!bestNext) break;
    
    used.add(bestNext.id);
    threadNodes.push({
      reflection: bestNext,
      connectionStrength: bestWeight,
      connectionReason: bestEdgeReasons,
    });
    
    current = bestNext;
  }

  // Compute key bridges (top 5 edges by weight within cluster)
  const clusterEdges = edges.filter(edge => {
    const fromCluster = nodeToCluster.get(edge.from);
    const toCluster = nodeToCluster.get(edge.to);
    return fromCluster === clusterId && toCluster === clusterId;
  });

  const keyBridges: KeyBridge[] = clusterEdges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(edge => {
      const fromReflection = clusterNodes.find(r => r.id === edge.from);
      const toReflection = clusterNodes.find(r => r.id === edge.to);
      if (!fromReflection || !toReflection) return null;
      
      return {
        from: fromReflection,
        to: toReflection,
        weight: edge.weight,
        reasons: edge.reasons || [],
      };
    })
    .filter((bridge): bridge is KeyBridge => bridge !== null);

  // Compute time range
  const times = clusterNodes.map(r => new Date(r.createdAt));
  const earliest = new Date(Math.min(...times.map(t => t.getTime())));
  const latest = new Date(Math.max(...times.map(t => t.getTime())));

  return {
    nodes: threadNodes,
    keyBridges,
    clusterSize: clusterNodes.length,
    timeRange: { earliest, latest },
  };
}

/**
 * Get cluster ID from a seed reflection ID
 */
export function getClusterIdFromSeed(
  seedReflectionId: string,
  nodeToCluster: Map<string, number>
): number | null {
  return nodeToCluster.get(seedReflectionId) ?? null;
}

