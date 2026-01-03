/**
 * PHILOSOPHY PRIMITIVE — DO NOT EXTEND LIGHTLY
 *
 * This module encodes the core worldview of Story of Emergence:
 * movement from determinism toward emergence across time.
 *
 * This is NOT:
 * - A predictive model
 * - A scoring system
 * - A recommendation engine
 * - A gamified visualization
 *
 * Rules:
 * - No new intelligence is introduced here
 * - No interactivity that changes meaning
 * - No user manipulation or optimization signals
 * - No reinterpretation of distributions
 *
 * This layer exists to orient, not instruct.
 * Any proposal to modify this must preserve philosophical neutrality.
 */

// src/app/components/philosophy/EmergenceMapViz.tsx
// EmergenceMap Visual Renderer - Pure presentational component
// Visual primitive: renders determinism → emergence spectrum as SVG

'use client';

import React from 'react';
import type { EmergenceMap } from '../../lib/philosophy/emergenceMap';

export interface EmergenceMapVizProps {
  /** EmergenceMap data to visualize */
  map: EmergenceMap;
  /** Optional width (default: responsive, fills container) */
  width?: number;
  /** Optional height (default: 300) */
  height?: number;
}

/**
 * Generate smooth boundary curve path for the emergence map
 * Creates a curve that suggests volatility/possibility space
 * Left (determinism): tighter bounds, less volatility
 * Right (emergence): wider bounds, more possibility space
 */
function generateBoundaryCurve(width: number, height: number): string {
  const padding = 40;
  const curveHeight = height * 0.5; // Curve takes up 50% of vertical space
  const centerY = height / 2;
  
  // Left side (determinism): tighter bounds - less vertical spread
  const leftTop = centerY - curveHeight * 0.2; // Small spread on left
  const leftBottom = centerY + curveHeight * 0.2;
  
  // Right side (emergence): wider bounds - more vertical spread (possibility space)
  const rightTop = centerY - curveHeight * 0.5; // Larger spread on right
  const rightBottom = centerY + curveHeight * 0.5;
  
  // Control points for smooth transition
  const midX = (width - padding * 2) / 2 + padding;
  const midTop = centerY - curveHeight * 0.3;
  const midBottom = centerY + curveHeight * 0.3;
  
  // Create closed path: top curve + bottom curve
  // Top curve: left (tight) → right (wide)
  // Bottom curve: right (wide) → left (tight)
  const path = `
    M ${padding} ${leftTop}
    C ${midX} ${midTop}, ${midX} ${midTop}, ${width - padding} ${rightTop}
    L ${width - padding} ${rightBottom}
    C ${midX} ${midBottom}, ${midX} ${midBottom}, ${padding} ${leftBottom}
    Z
  `;
  
  return path.trim();
}

/**
 * Get regime label position and styling
 */
function getRegimeLabel(regime: EmergenceMap['regime'], width: number, height: number): {
  x: number;
  y: number;
  label: string;
} {
  const padding = 40;
  const labelY = height - 20;
  
  switch (regime) {
    case 'deterministic':
      return { x: padding + width * 0.1, y: labelY, label: 'Deterministic' };
    case 'structured':
      return { x: padding + width * 0.35, y: labelY, label: 'Structured' };
    case 'emergent':
      return { x: padding + width * 0.65, y: labelY, label: 'Emergent' };
    case 'chaotic':
      return { x: padding + width * 0.9, y: labelY, label: 'Chaotic' };
  }
}

/**
 * Get regime zone boundaries for background shading
 */
function getRegimeZones(width: number, height: number): Array<{
  x: number;
  width: number;
  regime: EmergenceMap['regime'];
}> {
  const padding = 40;
  const zoneWidth = (width - padding * 2) / 4;
  
  return [
    { x: padding, width: zoneWidth, regime: 'deterministic' as const },
    { x: padding + zoneWidth, width: zoneWidth, regime: 'structured' as const },
    { x: padding + zoneWidth * 2, width: zoneWidth, regime: 'emergent' as const },
    { x: padding + zoneWidth * 3, width: zoneWidth, regime: 'chaotic' as const },
  ];
}

/**
 * EmergenceMapViz - Visual renderer for EmergenceMap
 * 
 * Pure presentational component - no data fetching, no computation, no insight logic.
 * Renders a visual map showing position on determinism → emergence spectrum.
 */
export function EmergenceMapViz({ map, width, height = 300 }: EmergenceMapVizProps) {
  // Use container width if not specified (responsive)
  const [containerWidth, setContainerWidth] = React.useState(width || 600);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Update width on resize if responsive
  React.useEffect(() => {
    if (width) return; // Fixed width, no resize handling needed
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [width]);
  
  const svgWidth = width || containerWidth;
  const svgHeight = height;
  const padding = 40;
  
  // Calculate position point coordinates
  const positionX = padding + (svgWidth - padding * 2) * map.position;
  const positionY = svgHeight / 2; // Center vertically
  
  // Generate boundary curve
  const boundaryPath = generateBoundaryCurve(svgWidth, svgHeight);
  
  // Get regime zones for subtle background
  const regimeZones = getRegimeZones(svgWidth, svgHeight);
  
  // Get regime label
  const regimeLabel = getRegimeLabel(map.regime, svgWidth, svgHeight);
  
  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: `${svgHeight}px` }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background regime zones - subtle */}
        {regimeZones.map((zone, index) => (
          <rect
            key={zone.regime}
            x={zone.x}
            y={0}
            width={zone.width}
            height={svgHeight}
            fill={`rgba(255, 255, 255, ${index % 2 === 0 ? '0.01' : '0.02'})`}
          />
        ))}
        
        {/* Boundary curve - smooth frontier */}
        <path
          d={boundaryPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Axis line - determinism → emergence */}
        <line
          x1={padding}
          y1={svgHeight / 2}
          x2={svgWidth - padding}
          y2={svgHeight / 2}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        
        {/* Axis labels */}
        <text
          x={padding}
          y={svgHeight / 2 - 10}
          fill="rgba(255, 255, 255, 0.4)"
          fontSize="10"
          textAnchor="start"
          fontFamily="system-ui, sans-serif"
        >
          Determinism
        </text>
        <text
          x={svgWidth - padding}
          y={svgHeight / 2 - 10}
          fill="rgba(255, 255, 255, 0.4)"
          fontSize="10"
          textAnchor="end"
          fontFamily="system-ui, sans-serif"
        >
          Emergence
        </text>
        
        {/* Regime zone labels - subtle */}
        {regimeZones.map((zone) => {
          const label = getRegimeLabel(zone.regime, svgWidth, svgHeight);
          return (
            <text
              key={zone.regime}
              x={zone.x + zone.width / 2}
              y={label.y}
              fill="rgba(255, 255, 255, 0.3)"
              fontSize="9"
              textAnchor="middle"
              fontFamily="system-ui, sans-serif"
              fontWeight={map.regime === zone.regime ? '500' : '300'}
            >
              {label.label}
            </text>
          );
        })}
        
        {/* Position point - highlighted */}
        <circle
          cx={positionX}
          cy={positionY}
          r="6"
          fill="rgba(255, 255, 255, 0.9)"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1"
        />
        
        {/* Position point inner dot */}
        <circle
          cx={positionX}
          cy={positionY}
          r="3"
          fill="rgba(0, 0, 0, 0.8)"
        />
        
        {/* Current regime highlight - subtle background */}
        {regimeZones
          .filter((zone) => zone.regime === map.regime)
          .map((zone) => (
            <rect
              key={`highlight-${zone.regime}`}
              x={zone.x}
              y={0}
              width={zone.width}
              height={svgHeight}
              fill="rgba(255, 255, 255, 0.03)"
            />
          ))}
      </svg>
      
      {/* Narrative label - below SVG */}
      <div className="mt-4 text-center">
        <p className="text-sm text-white/70 font-medium">{map.narrativeLabel}</p>
        <p className="text-xs text-white/50 mt-1 max-w-2xl mx-auto">{map.explanation}</p>
      </div>
    </div>
  );
}

