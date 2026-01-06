// src/app/insights/components/MiniHistogram.tsx
// Mini histogram chart component

'use client';

import React from 'react';
import type { IntensityLevel } from '../lib/intensitySystem';
import { getIntensityColor, getIntensityBarOpacity, getIntensityBarDensity, getIntensityGlow } from '../lib/intensitySystem';
import type { DensityMode } from '../hooks/useDensity';
import { getChartHeight, getChartProminence } from '../lib/densityStyles';
import { NowIndicator } from './NowIndicator';
import '../styles/delights.css';
import '../styles/visualHaptics.css';

export interface MiniHistogramProps {
  values: number[];
  ghostValues?: number[]; // Previous period values for ghost comparison
  width?: number;
  height?: number;
  barColor?: string;
  baselineColor?: string;
  intensity?: IntensityLevel; // Unified intensity level
  densityMode?: DensityMode; // Optional density mode
  dates?: string[]; // Optional dates array for "Now" indicator
  narrativeTone?: 'calm' | 'poetic' | 'analytical' | 'mirror';
}

export function MiniHistogram({
  values,
  ghostValues,
  width = 200,
  height = 56,
  barColor,
  baselineColor,
  intensity,
  densityMode = 'spacious',
  dates,
  narrativeTone = 'calm',
}: MiniHistogramProps) {
  const effectiveHeight = densityMode ? getChartHeight(densityMode, height) : height;
  const prominenceClass = densityMode ? getChartProminence(densityMode) : '';
  if (!values || values.length === 0) {
    return null;
  }

  // Use intensity system if provided, otherwise use defaults
  const effectiveBarColor = intensity ? getIntensityColor(intensity, 1) : (barColor || 'rgba(16, 185, 129, 0.5)');
  const effectiveBaselineColor = intensity ? getIntensityColor(intensity, 0.2) : (baselineColor || 'rgba(16, 185, 129, 0.2)');
  const barOpacity = intensity ? getIntensityBarOpacity(intensity) : 1;
  const densityMultiplier = intensity ? getIntensityBarDensity(intensity) : 0.9;

  const maxValue = Math.max(...values, ghostValues ? Math.max(...ghostValues, 1) : 1);
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / values.length;
  const gap = Math.max(1, barWidth * (1 - densityMultiplier));

  return (
    <svg width={width} height={effectiveHeight} className={`w-full h-full ${prominenceClass}`}>
      {/* Baseline glow */}
      <line
        x1={padding}
        y1={padding + chartHeight}
        x2={width - padding}
        y2={padding + chartHeight}
        stroke={baselineColor}
        strokeWidth="1"
        opacity={0.6}
      />
      
      {/* Ghost bars (previous period) */}
      {ghostValues && ghostValues.length === values.length && ghostValues.map((value, i) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + i * barWidth;
        const y = padding + chartHeight - barHeight;
        const actualBarWidth = barWidth - gap;

        return (
          <rect
            key={`ghost-${i}`}
            x={x + gap / 2}
            y={y}
            width={actualBarWidth}
            height={Math.max(barHeight, value > 0 ? 1 : 0)}
            fill="rgba(255, 255, 255, 0.08)"
            rx="2"
            ry="2"
            opacity={value > 0 ? 0.3 : 0}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        );
      })}
      
      {/* Bars */}
      {values.map((value, i) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + i * barWidth;
        const y = padding + chartHeight - barHeight;
        const actualBarWidth = barWidth - gap;
        const valueIntensity = intensity || (value >= maxValue * 0.7 ? 'high' : value >= maxValue * 0.4 ? 'medium' : 'low');
        const barGlow = intensity ? getIntensityGlow(valueIntensity) : 'none';

        return (
          <g key={i}>
            <rect
              x={x + gap / 2}
              y={y}
              width={actualBarWidth}
              height={Math.max(barHeight, value > 0 ? 1 : 0)}
              fill={effectiveBarColor}
              rx="2"
              ry="2"
              opacity={value > 0 ? barOpacity : 0.2}
              className="bar-grow-in chart-bar-haptic"
              style={{
                animationDelay: `${i * 0.03}s`,
                transition: 'opacity 0.2s ease-out, transform 0.2s ease-out, filter 0.2s ease-out',
                filter: barGlow,
                cursor: 'pointer',
                transformOrigin: 'bottom',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scaleY(1.08) translateY(-1px)';
                e.currentTarget.style.filter = `${barGlow} brightness(1.2)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = String(value > 0 ? barOpacity : 0.2);
                e.currentTarget.style.transform = 'scaleY(1) translateY(0)';
                e.currentTarget.style.filter = barGlow;
              }}
            />
          </g>
        );
      })}
      
      {/* Now indicator */}
      {dates && dates.length > 0 && (
        <NowIndicator
          dates={dates}
          width={width}
          height={effectiveHeight}
          padding={{ left: padding, right: padding, top: padding, bottom: padding }}
          narrativeTone={narrativeTone}
        />
      )}
    </svg>
  );
}

