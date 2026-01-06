// src/app/insights/components/NowIndicator.tsx
// "Now" presence indicator - vertical glow aligned to today

'use client';

import React, { useMemo } from 'react';

export interface NowIndicatorProps {
  dates: string[]; // Array of date strings in YYYY-MM-DD format
  width: number; // Total width of the visualization
  height: number; // Total height of the visualization
  padding?: { left: number; right: number; top: number; bottom: number };
  narrativeTone?: 'calm' | 'poetic' | 'analytical' | 'mirror';
}

export function NowIndicator({
  dates,
  width,
  height,
  padding = { left: 20, right: 20, top: 20, bottom: 30 },
  narrativeTone = 'calm',
}: NowIndicatorProps) {
  // Find today's position in the dates array
  const todayPosition = useMemo(() => {
    if (!dates || dates.length === 0) return null;
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const index = dates.findIndex(d => d === todayStr);
    if (index === -1) return null;
    
    return index;
  }, [dates]);

  if (todayPosition === null) return null;

  // Calculate x position
  const chartWidth = width - padding.left - padding.right;
  const step = chartWidth / (dates.length - 1 || 1);
  const x = padding.left + todayPosition * step;

  // Tone-based styling
  const glowOpacity = narrativeTone === 'analytical' ? 0.4 : narrativeTone === 'poetic' ? 0.3 : narrativeTone === 'mirror' ? 0.2 : 0.35;
  const lineOpacity = narrativeTone === 'analytical' ? 0.6 : narrativeTone === 'poetic' ? 0.5 : narrativeTone === 'mirror' ? 0.3 : 0.5;
  const glowColor = narrativeTone === 'mirror' ? 'rgba(200, 200, 200' : 'rgba(16, 185, 129';

  return (
    <g className="now-indicator">
      {/* Glow effect */}
      <defs>
        <linearGradient id="nowGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={`${glowColor}, 0)`} />
          <stop offset="50%" stopColor={`${glowColor}, ${glowOpacity})`} />
          <stop offset="100%" stopColor={`${glowColor}, 0)`} />
        </linearGradient>
        <filter id="nowGlowFilter">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Glow rectangle */}
      <rect
        x={x - 8}
        y={padding.top}
        width={16}
        height={height - padding.top - padding.bottom}
        fill="url(#nowGlow)"
        opacity={glowOpacity}
        filter="url(#nowGlowFilter)"
      />
      
      {/* Thin vertical line */}
      <line
        x1={x}
        y1={padding.top}
        x2={x}
        y2={height - padding.bottom}
        stroke={narrativeTone === 'mirror' ? 'rgba(200, 200, 200' : 'rgba(16, 185, 129'}
        strokeWidth={narrativeTone === 'analytical' ? 1.5 : 1}
        strokeOpacity={lineOpacity}
        strokeDasharray={narrativeTone === 'poetic' ? '2,2' : 'none'}
      />
      
      {/* Label */}
      <text
        x={x}
        y={padding.top - 8}
        textAnchor="middle"
        fontSize="10"
        fill={narrativeTone === 'mirror' ? 'rgba(200, 200, 200' : 'rgba(16, 185, 129'}
        fillOpacity={lineOpacity * 0.8}
        className="text-xs"
      >
        Now
      </text>
    </g>
  );
}

