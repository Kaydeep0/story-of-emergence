// src/components/reflections/pins/ClusterPreview.tsx
// Cluster pin preview - mini constellation
// Layer 4: Visual encoding

'use client';

import { useMemo } from 'react';
import { layoutPoints } from '../../../lib/graph/seededLayout';
import type { ClusterPinPayload } from '../../../app/lib/pins';

interface ClusterPreviewProps {
  payload: ClusterPinPayload;
  walletAddress: string;
  width?: number;
  height?: number;
}

export function ClusterPreview({
  payload,
  walletAddress,
  width = 200,
  height = 120,
}: ClusterPreviewProps) {
  // Sample nodes (max 40 for performance)
  const sampledIds = useMemo(() => {
    return payload.memberIds.slice(0, 40);
  }, [payload.memberIds]);

  // Build node size map from topNodes
  const nodeSizes = useMemo(() => {
    const sizes: Record<string, number> = {};
    const maxDegree = Math.max(...payload.topNodes.map(n => n.degree), 1);
    
    payload.topNodes.forEach(node => {
      sizes[node.id] = 2 + (node.degree / maxDegree) * 4; // 2-6px radius
    });
    
    // Default size for nodes not in topNodes
    sampledIds.forEach(id => {
      if (!sizes[id]) {
        sizes[id] = 2;
      }
    });
    
    return sizes;
  }, [payload.topNodes, sampledIds]);

  // Generate deterministic layout
  const positions = useMemo(() => {
    const seed = `${payload.clusterId}_${walletAddress}`;
    return layoutPoints(sampledIds, seed, width, height);
  }, [sampledIds, payload.clusterId, walletAddress, width, height]);

  // Generate implied edges (top connections by proximity)
  const edges = useMemo(() => {
    const edgeCandidates: Array<{ from: string; to: string; dist: number }> = [];
    
    for (let i = 0; i < sampledIds.length; i++) {
      for (let j = i + 1; j < sampledIds.length; j++) {
        const from = sampledIds[i];
        const to = sampledIds[j];
        const fromPos = positions[from];
        const toPos = positions[to];
        
        if (fromPos && toPos) {
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          edgeCandidates.push({ from, to, dist });
        }
      }
    }
    
    // Sort by distance and take top 10 closest
    return edgeCandidates
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 10);
  }, [sampledIds, positions]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-[hsl(var(--bg1)/0.3)] border border-[hsl(var(--line)/0.3)]">
      <svg width={width} height={height} className="w-full h-full">
        {/* Edges */}
        {edges.map((edge, i) => {
          const fromPos = positions[edge.from];
          const toPos = positions[edge.to];
          if (!fromPos || !toPos) return null;
          
          return (
            <line
              key={i}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="hsl(var(--accent))"
              strokeWidth={0.5}
              opacity={0.15}
            />
          );
        })}
        
        {/* Nodes */}
        {sampledIds.map(id => {
          const pos = positions[id];
          if (!pos) return null;
          
          const size = nodeSizes[id] || 2;
          const isTopNode = payload.topNodes.some(n => n.id === id);
          
          return (
            <circle
              key={id}
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={isTopNode ? 'hsl(var(--accent))' : 'hsl(var(--muted))'}
              opacity={isTopNode ? 0.7 : 0.4}
            />
          );
        })}
      </svg>
      
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" 
        style={{
          boxShadow: 'inset 0 0 20px hsl(var(--accent) / 0.05)',
        }}
      />
    </div>
  );
}

