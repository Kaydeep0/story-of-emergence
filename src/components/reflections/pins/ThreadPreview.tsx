// src/components/reflections/pins/ThreadPreview.tsx
// Thread pin preview - vertical trace
// Layer 4: Visual encoding

'use client';

import { useMemo } from 'react';
import { layoutThreadPoints } from '../../../lib/graph/seededLayout';
import type { ThreadPinPayload } from '../../../app/lib/pins';

interface ThreadPreviewProps {
  payload: ThreadPinPayload;
  walletAddress: string;
  width?: number;
  height?: number;
}

export function ThreadPreview({
  payload,
  walletAddress,
  width = 200,
  height = 120,
}: ThreadPreviewProps) {
  // Sample nodes (8-12 nodes)
  const sampledIds = useMemo(() => {
    const count = Math.min(Math.max(8, payload.orderedReflectionIds.length), 12);
    const step = payload.orderedReflectionIds.length / count;
    const sampled: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(i * step);
      sampled.push(payload.orderedReflectionIds[index]);
    }
    
    return sampled;
  }, [payload.orderedReflectionIds]);

  // Build set of key bridge endpoints
  const keyBridgeEndpoints = useMemo(() => {
    const endpoints = new Set<string>();
    payload.keyBridges.forEach(bridge => {
      endpoints.add(bridge.from);
      endpoints.add(bridge.to);
    });
    return endpoints;
  }, [payload.keyBridges]);

  // Generate deterministic layout
  const positions = useMemo(() => {
    const seed = `${payload.seedReflectionId}_${walletAddress}`;
    return layoutThreadPoints(sampledIds, seed, width, height);
  }, [sampledIds, payload.seedReflectionId, walletAddress, width, height]);

  // Build edges from ordered sequence
  const edges = useMemo(() => {
    const threadEdges: Array<{ from: string; to: string }> = [];
    
    for (let i = 0; i < sampledIds.length - 1; i++) {
      threadEdges.push({
        from: sampledIds[i],
        to: sampledIds[i + 1],
      });
    }
    
    return threadEdges;
  }, [sampledIds]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-[hsl(var(--bg1)/0.3)] border border-[hsl(var(--line)/0.3)]">
      <svg width={width} height={height} className="w-full h-full">
        {/* Thread spine */}
        {edges.map((edge, i) => {
          const fromPos = positions[edge.from];
          const toPos = positions[edge.to];
          if (!fromPos || !toPos) return null;
          
          const isKeyBridge = payload.keyBridges.some(
            b => (b.from === edge.from && b.to === edge.to) ||
                 (b.from === edge.to && b.to === edge.from)
          );
          
          return (
            <line
              key={i}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="hsl(var(--accent))"
              strokeWidth={isKeyBridge ? 2 : 1}
              opacity={isKeyBridge ? 0.4 : 0.2}
            />
          );
        })}
        
        {/* Nodes */}
        {sampledIds.map(id => {
          const pos = positions[id];
          if (!pos) return null;
          
          const isKeyEndpoint = keyBridgeEndpoints.has(id);
          const size = isKeyEndpoint ? 4 : 2.5;
          
          return (
            <g key={id}>
              {/* Outer glow for key endpoints */}
              {isKeyEndpoint && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size + 2}
                  fill="hsl(var(--accent))"
                  opacity={0.2}
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size}
                fill={isKeyEndpoint ? 'hsl(var(--accent))' : 'hsl(var(--muted))'}
                opacity={isKeyEndpoint ? 0.9 : 0.6}
              />
            </g>
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

