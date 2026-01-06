// src/app/components/TimelineWaveform.tsx
// Living EEG-like waveform for Timeline visualization
// Flowing waveform with spike distortions and noise in inactive regions

'use client';

import React, { useMemo, useState } from 'react';
import '../../app/insights/styles/delights.css';
import '../../app/insights/styles/visualHaptics.css';
import { NowIndicator } from '../../app/insights/components/NowIndicator';

export interface TimelineWaveformProps {
  dailyCounts: number[];
  dates?: string[];
  width?: number;
  height?: number;
  color?: string;
  spikeThreshold?: number; // Values above this show distortion
  narrativeTone?: 'calm' | 'poetic' | 'analytical' | 'mirror';
}

export function TimelineWaveform({
  dailyCounts,
  dates,
  width = 800,
  height = 200,
  color = 'rgba(16, 185, 129, 0.6)',
  spikeThreshold,
  narrativeTone = 'calm',
}: TimelineWaveformProps) {
  if (!dailyCounts || dailyCounts.length === 0) {
    return null;
  }

  const maxValue = Math.max(...dailyCounts, 1);
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const effectiveThreshold = spikeThreshold ?? maxValue * 0.6;

  // Generate smooth waveform points with spike distortions
  const waveformPoints = useMemo(() => {
    const points: Array<{ x: number; y: number; value: number; isSpike: boolean }> = [];
    const step = chartWidth / (dailyCounts.length - 1 || 1);

    dailyCounts.forEach((value, i) => {
      const x = padding.left + i * step;
      const normalizedValue = value / maxValue;
      const baseY = padding.top + chartHeight - (normalizedValue * chartHeight);
      
      // Add subtle wave distortion for organic feel
      const waveOffset = Math.sin((i / dailyCounts.length) * Math.PI * 4) * 1.5;
      
      // Spike distortion: spikes push the line up and create a sharper peak
      const isSpike = value >= effectiveThreshold;
      const spikeDistortion = isSpike 
        ? (value / maxValue) * 8 * Math.exp(-Math.pow((i - dailyCounts.length / 2) / (dailyCounts.length / 4), 2))
        : 0;
      
      const y = baseY - waveOffset - spikeDistortion;
      
      points.push({
        x,
        y,
        value,
        isSpike,
      });
    });

    return points;
  }, [dailyCounts, maxValue, chartWidth, chartHeight, padding, effectiveThreshold]);

  // Generate smooth path using quadratic curves for flowing waveform
  const pathData = useMemo(() => {
    if (waveformPoints.length < 2) return '';
    
    let path = `M ${waveformPoints[0].x} ${waveformPoints[0].y}`;
    
    for (let i = 0; i < waveformPoints.length - 1; i++) {
      const current = waveformPoints[i];
      const next = waveformPoints[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      
      // Use quadratic curves for smoother flow
      // Around spikes, create sharper curves; elsewhere, gentle flow
      const dx = next.x - current.x;
      
      if (current.isSpike || next.isSpike) {
        // Tighter control point for spikes - creates sharper peaks
        const controlX = midX;
        const controlY = Math.min(current.y, next.y) - Math.abs(current.y - next.y) * 0.3;
        path += ` Q ${controlX} ${controlY} ${next.x} ${next.y}`;
      } else {
        // Smooth flow for normal regions
        const controlX = midX;
        const controlY = midY;
        path += ` Q ${controlX} ${controlY} ${next.x} ${next.y}`;
      }
    }
    
    return path;
  }, [waveformPoints]);

  // Generate noise pattern for inactive regions (EEG-like background noise)
  const noisePattern = useMemo(() => {
    const noisePoints: Array<{ x: number; y: number; opacity: number }> = [];
    const baselineY = padding.top + chartHeight;
    
    // Generate more noise points for better coverage
    const noiseDensity = 3; // Points per inactive day
    dailyCounts.forEach((value, i) => {
      if (value === 0 || value < maxValue * 0.15) {
        const x = padding.left + (i / (dailyCounts.length - 1 || 1)) * chartWidth;
        // Generate multiple noise points per inactive region
        for (let j = 0; j < noiseDensity; j++) {
          const offsetX = (j / noiseDensity) * (chartWidth / dailyCounts.length);
          const noiseAmplitude = 1.5;
          const noiseY = baselineY - 1 - Math.random() * noiseAmplitude;
          const opacity = 0.2 + Math.random() * 0.2; // Vary opacity for depth
          noisePoints.push({ x: x + offsetX, y: noiseY, opacity });
        }
      }
    });
    
    return noisePoints;
  }, [dailyCounts, maxValue, chartWidth, chartHeight, padding]);

  // Tone-based styling
  const strokeWidth = narrativeTone === 'analytical' ? 2 : narrativeTone === 'poetic' ? 1.5 : 1.5;
  const strokeOpacity = narrativeTone === 'mirror' ? 0.4 : narrativeTone === 'poetic' ? 0.7 : 0.6;
  const areaOpacity = narrativeTone === 'mirror' ? 0.05 : narrativeTone === 'poetic' ? 0.12 : 0.08;

  return (
    <svg width={width} height={height} className="w-full h-full" style={{ filter: narrativeTone === 'poetic' ? 'blur(0.5px)' : 'none' }}>
      <defs>
        {/* Gradient for waveform */}
        <linearGradient id="waveformGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={strokeOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={strokeOpacity * 0.6} />
        </linearGradient>
        
        {/* Gradient for area fill */}
        <linearGradient id="waveformAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={areaOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        
        {/* Glow filter for spikes */}
        <filter id="spikeGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Baseline */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={width - padding.right}
        y2={padding.top + chartHeight}
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />

      {/* Noise pattern for inactive regions (EEG background) */}
      {noisePattern.map((point, i) => (
        <circle
          key={`noise-${i}`}
          cx={point.x}
          cy={point.y}
          r="0.4"
          fill="rgba(255, 255, 255, 0.2)"
          opacity={point.opacity}
        />
      ))}

      {/* Area fill under waveform */}
      <path
        d={`${pathData} L ${waveformPoints[waveformPoints.length - 1].x} ${padding.top + chartHeight} L ${waveformPoints[0].x} ${padding.top + chartHeight} Z`}
        fill="url(#waveformAreaGradient)"
        opacity={0.4}
      />

      {/* Main waveform line */}
      <path
        d={pathData}
        fill="none"
        stroke="url(#waveformGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="waveSubtle chart-proximity"
        style={{
          filter: waveformPoints.some(p => p.isSpike) ? 'url(#spikeGlow)' : 'none',
          transition: 'filter 0.2s ease-out, stroke-width 0.2s ease-out',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = waveformPoints.some(p => p.isSpike) 
            ? 'url(#spikeGlow) brightness(1.1)' 
            : 'brightness(1.1)';
          e.currentTarget.style.strokeWidth = String(strokeWidth + 0.5);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = waveformPoints.some(p => p.isSpike) ? 'url(#spikeGlow)' : 'none';
          e.currentTarget.style.strokeWidth = String(strokeWidth);
        }}
      />

      {/* Spike markers */}
      {waveformPoints
        .filter(p => p.isSpike)
        .map((point, i) => (
          <g key={`spike-${i}`}>
            {/* Spike distortion highlight */}
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              opacity={0.3}
              className="spike-pulse"
              style={{
                animationDelay: `${i * 0.1}s`,
              }}
            />
            {/* Spike center */}
            <circle
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={color}
              opacity={0.8}
            />
          </g>
        ))}
      
      {/* Now indicator */}
      {dates && dates.length > 0 && (
        <NowIndicator
          dates={dates}
          width={width}
          height={height}
          padding={padding}
          narrativeTone={narrativeTone}
        />
      )}
    </svg>
  );
}

