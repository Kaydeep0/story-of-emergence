/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical insight components
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

// src/app/insights/components/MiniSparkline.tsx
// Mini sparkline chart component with animation

'use client';

import React, { useEffect, useState } from 'react';
import '../styles/delights.css';
import '../styles/visualHaptics.css';

export interface MiniSparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  spikeThreshold?: number; // Values above this threshold show dots
}

export function MiniSparkline({
  values,
  width = 200,
  height = 56,
  color = 'rgba(16, 185, 129, 0.6)',
  spikeThreshold,
}: MiniSparklineProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!values || values.length === 0) {
    return null;
  }

  const maxValue = Math.max(...values, 1);
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate points for the line
  const points: Array<{ x: number; y: number; value: number }> = values.map((value, i) => {
    const x = padding + (i / (values.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - (value / maxValue) * chartHeight;
    return { x, y, value };
  });

  // Build path string
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Calculate stroke dasharray for animation
  const pathLength = points.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  const effectiveThreshold = spikeThreshold ?? maxValue * 0.7;

  return (
    <svg width={width} height={height} className="w-full h-full">
      {/* Baseline glow */}
      <line
        x1={padding}
        y1={padding + chartHeight}
        x2={width - padding}
        y2={padding + chartHeight}
        stroke="rgba(16, 185, 129, 0.2)"
        strokeWidth="1"
      />
      
      {/* Animated path */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animated ? '0' : `${pathLength}`}
        strokeDashoffset={animated ? '0' : `${pathLength}`}
        style={{
          transition: 'stroke-dashoffset 0.8s ease-out',
        }}
      />
      
      {/* Spike dots */}
      {points
        .filter((p) => p.value >= effectiveThreshold)
        .map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill={color}
            className="spike-pulse"
            style={{
              animationDelay: `${0.5 + i * 0.1}s`,
            }}
          />
        ))}
    </svg>
  );
}

