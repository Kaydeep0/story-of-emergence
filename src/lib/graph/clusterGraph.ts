// src/lib/graph/clusterGraph.ts
// Cluster computation for reflection graph
// Layer 1: Signal layer - computable metrics only

import type { Edge } from './buildReflectionGraph';

export interface ClusterResult {
  clusterId: number;
  nodeIds: string[];
}

export interface NodeCluster {
  nodeId: string;
  clusterId: number;
}

/**
 * Compute clusters from weighted edges using connected components with weight threshold
 * 
 * Strategy:
 * 1. Start with threshold 0.18
 * 2. Build undirected adjacency list from edges above threshold
 * 3. Compute connected components
 * 4. If one giant component (>80% of nodes), increase threshold progressively
 * 5. Isolated nodes become their own cluster
 * 
 * @param edges - Array of graph edges with weights
 * @param nodeIds - Array of all node IDs (to ensure no nodes are dropped)
 * @returns Map of nodeId -> clusterId
 */
export function computeClusters(
  edges: Edge[],
  nodeIds: string[]
): Map<string, number> {
  if (nodeIds.length === 0) {
    return new Map();
  }

  // Try progressively higher thresholds until clusters form
  const thresholds = [0.18, 0.22, 0.26, 0.30];
  
  for (const threshold of thresholds) {
    const clusters = computeClustersWithThreshold(edges, nodeIds, threshold);
    
    // Check if we have reasonable clustering (not one giant component)
    const clusterSizes = Array.from(clusters.values());
    const maxClusterSize = Math.max(...clusterSizes);
    const giantComponentThreshold = nodeIds.length * 0.8;
    
    // If we have multiple clusters or the largest is reasonable, use this threshold
    if (clusters.size > 1 || maxClusterSize <= giantComponentThreshold) {
      return clusters;
    }
  }
  
  // Fallback: use highest threshold result
  return computeClustersWithThreshold(edges, nodeIds, thresholds[thresholds.length - 1]);
}

/**
 * Compute clusters with a specific weight threshold
 */
function computeClustersWithThreshold(
  edges: Edge[],
  nodeIds: string[],
  threshold: number
): Map<string, number> {
  // Build undirected adjacency list (only edges above threshold)
  const adjacencyList = new Map<string, Set<string>>();
  
  // Initialize all nodes
  nodeIds.forEach(id => {
    adjacencyList.set(id, new Set());
  });
  
  // Add edges above threshold (undirected)
  edges.forEach(edge => {
    if (edge.weight >= threshold) {
      const fromSet = adjacencyList.get(edge.from);
      const toSet = adjacencyList.get(edge.to);
      if (fromSet && toSet) {
        fromSet.add(edge.to);
        toSet.add(edge.from);
      }
    }
  });
  
  // Compute connected components using DFS
  const visited = new Set<string>();
  const nodeToCluster = new Map<string, number>();
  let currentClusterId = 0;
  
  function dfs(nodeId: string, clusterId: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    nodeToCluster.set(nodeId, clusterId);
    
    const neighbors = adjacencyList.get(nodeId);
    if (neighbors) {
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          dfs(neighborId, clusterId);
        }
      });
    }
  }
  
  // Find all connected components
  nodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      dfs(nodeId, currentClusterId);
      currentClusterId++;
    }
  });
  
  return nodeToCluster;
}

/**
 * Get cluster statistics (size, node IDs) for each cluster
 */
export function getClusterStats(
  nodeToCluster: Map<string, number>
): Map<number, ClusterResult> {
  const clusterMap = new Map<number, ClusterResult>();
  
  nodeToCluster.forEach((clusterId, nodeId) => {
    const existing = clusterMap.get(clusterId);
    if (existing) {
      existing.nodeIds.push(nodeId);
    } else {
      clusterMap.set(clusterId, {
        clusterId,
        nodeIds: [nodeId],
      });
    }
  });
  
  return clusterMap;
}

/**
 * Get stable color for a cluster ID
 * Uses a small futuristic palette, reuses colors if more clusters
 * 
 * Colors are subtle and readable on dark background
 */
export function getClusterColor(clusterId: number): string {
  // Futuristic palette: emerald, cyan, purple, amber, rose, indigo, teal, pink
  const palette = [
    '162 100% 45%', // emerald
    '180 100% 50%', // cyan
    '280 85% 62%',  // purple
    '45 100% 55%',  // amber
    '350 90% 60%',  // rose
    '250 90% 65%',  // indigo
    '170 80% 50%',  // teal
    '330 80% 65%',  // pink
  ];
  
  const colorIndex = clusterId % palette.length;
  return `hsl(${palette[colorIndex]})`;
}

/**
 * Get cluster color with opacity
 */
export function getClusterColorWithOpacity(clusterId: number, opacity: number): string {
  const baseColor = getClusterColor(clusterId);
  return `${baseColor} / ${opacity}`;
}

