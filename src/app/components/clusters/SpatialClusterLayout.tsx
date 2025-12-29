'use client';

import type { ConceptualCluster, ClusterAssociation } from '@/app/lib/clusters/conceptualClusters';
import { calculateClusterDistance, getDistanceLabel } from '@/app/lib/clusters/conceptualClusters';

type ClusterPosition = {
  cluster: ConceptualCluster;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
};

/**
 * Calculate deterministic positions for clusters based on distance metrics
 * Same data always produces same layout
 */
function calculateClusterPositions(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  currentPeriod: string
): ClusterPosition[] {
  if (clusters.length < 2) {
    return [];
  }

  // Create a map of cluster positions
  const positions: ClusterPosition[] = [];
  const clusterMap = new Map(clusters.map(c => [c.id, c]));

  // Simple grid-based layout with distance-based spacing
  // Use cluster IDs for deterministic ordering
  const sortedClusters = [...clusters].sort((a, b) => a.id.localeCompare(b.id));

  // Calculate positions based on associations and distances
  const placed = new Set<string>();
  const gridSize = Math.ceil(Math.sqrt(clusters.length));
  const cellSize = 100 / gridSize;

  // Place clusters in a grid, but adjust based on associations
  sortedClusters.forEach((cluster, index) => {
    if (placed.has(cluster.id)) return;

    // Base grid position
    const gridX = (index % gridSize) * cellSize + cellSize / 2;
    const gridY = Math.floor(index / gridSize) * cellSize + cellSize / 2;

    // Adjust position based on associations
    let adjustedX = gridX;
    let adjustedY = gridY;
    let adjustmentCount = 0;

    // Find associated clusters and adjust position
    const relatedAssociations = associations.filter(
      assoc => assoc.fromClusterId === cluster.id || assoc.toClusterId === cluster.id
    );

    for (const assoc of relatedAssociations.slice(0, 3)) {
      const otherClusterId = assoc.fromClusterId === cluster.id
        ? assoc.toClusterId
        : assoc.fromClusterId;
      const otherCluster = clusterMap.get(otherClusterId);

      if (otherCluster && placed.has(otherClusterId)) {
        const existingPos = positions.find(p => p.cluster.id === otherClusterId);
        if (existingPos) {
          // Calculate distance
          const distance = calculateClusterDistance(cluster, otherCluster, {
            allClusters: clusters,
            currentPeriod,
          });

          if (distance !== null) {
            const distanceLabel = getDistanceLabel(distance);
            
            // Adjust position based on distance bucket
            // "usually" = close (small offset), "sometimes" = medium, "rarely" = far
            let offsetX = 0;
            let offsetY = 0;

            if (distanceLabel === 'usually') {
              // Close - small random offset to avoid exact overlap
              offsetX = (cluster.id.charCodeAt(0) % 10) - 5;
              offsetY = (cluster.id.charCodeAt(1) % 10) - 5;
            } else if (distanceLabel === 'sometimes') {
              // Medium distance
              offsetX = (cluster.id.charCodeAt(0) % 20) - 10;
              offsetY = (cluster.id.charCodeAt(1) % 20) - 10;
            } else {
              // Far - larger offset
              offsetX = (cluster.id.charCodeAt(0) % 30) - 15;
              offsetY = (cluster.id.charCodeAt(1) % 30) - 15;
            }

            adjustedX += offsetX * 0.1;
            adjustedY += offsetY * 0.1;
            adjustmentCount++;
          }
        }
      }
    }

    // Average adjustments
    if (adjustmentCount > 0) {
      adjustedX = (gridX + adjustedX) / 2;
      adjustedY = (gridY + adjustedY) / 2;
    }

    // Clamp to bounds
    adjustedX = Math.max(10, Math.min(90, adjustedX));
    adjustedY = Math.max(10, Math.min(90, adjustedY));

    positions.push({
      cluster,
      x: adjustedX,
      y: adjustedY,
    });

    placed.add(cluster.id);
  });

  return positions;
}

type Props = {
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
};

/**
 * Read-only spatial layout of conceptual clusters
 * Visual projection only - no new analysis or inference
 * Static, deterministic, calm presentation
 */
export function SpatialClusterLayout({ clusters, associations }: Props) {
  // Silence rules: render nothing if insufficient data
  if (clusters.length < 2) {
    return null;
  }

  const currentPeriod = new Date().getFullYear().toString();
  const positions = calculateClusterPositions(clusters, associations, currentPeriod);

  if (positions.length < 2) {
    return null;
  }

  return (
    <div className="relative w-full h-96 bg-gray-50/30 rounded-lg overflow-hidden">
      {positions.map(({ cluster, x, y }) => (
        <div
          key={cluster.id}
          className="absolute"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Soft spatial region - low opacity, no hard borders */}
          <div
            className="absolute inset-0 rounded-full bg-gray-300/20 blur-xl"
            style={{
              width: '120px',
              height: '120px',
              transform: 'translate(-50%, -50%)',
            }}
          />
          
          {/* Cluster label - small, neutral, secondary */}
          <div className="relative z-10 text-xs text-gray-600 font-normal whitespace-nowrap">
            {cluster.label}
          </div>
        </div>
      ))}
    </div>
  );
}

