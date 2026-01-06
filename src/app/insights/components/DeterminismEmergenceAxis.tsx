// src/app/insights/components/DeterminismEmergenceAxis.tsx
// Visual axis mapping constraint vs freedom using existing distribution signals

'use client';

import { useMemo } from 'react';
import type { ReflectionEntry } from '../../lib/insights/types';
import { buildDistributionFromReflections } from '../../lib/distributions/buildSeries';
import { classifyDistribution } from '../../lib/distributions/classify';
import { inspectDistribution } from '../../lib/distributions/inspect';
import { filterEventsByWindow } from '../../lib/insights/timeWindows';
import '../styles/delights.css';

interface DeterminismEmergenceAxisProps {
  reflections: ReflectionEntry[];
  narrativeTone: 'calm' | 'poetic' | 'analytical' | 'mirror';
}

/**
 * Compute determinism-emergence score from distribution signals
 * Returns a value between 0 (high determinism) and 1 (high emergence)
 */
function computeDeterminismEmergenceScore(reflections: ReflectionEntry[]): number {
  if (reflections.length === 0) return 0.5; // Neutral if no data

  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const windowReflections = filterEventsByWindow(reflections, start, now);

  if (windowReflections.length < 10) return 0.5; // Need minimum data

  // Build distribution series
  const series = buildDistributionFromReflections(windowReflections, 'day', 'normal');
  const shape = classifyDistribution(series);
  const stats = inspectDistribution(series);

  // Extract weights for analysis
  const weights = series.points.map(p => p.weight).filter(w => w > 0);
  if (weights.length === 0) return 0.5;

  // Compute metrics
  const meanWeight = stats.totalWeight / weights.length;
  const sortedWeights = [...weights].sort((a, b) => a - b);
  const medianWeight = sortedWeights.length % 2 === 0
    ? (sortedWeights[sortedWeights.length / 2 - 1] + sortedWeights[sortedWeights.length / 2]) / 2
    : sortedWeights[Math.floor(sortedWeights.length / 2)];

  // Variance (normalized)
  const variance = weights.reduce((sum, w) => {
    const diff = w - meanWeight;
    return sum + (diff * diff);
  }, 0) / weights.length;
  const normalizedVariance = Math.min(1, variance / (meanWeight * meanWeight + 1));

  // Skew ratio (median/mean) - lower = more emergence
  const skewRatio = medianWeight / (meanWeight + 0.1);

  // Tail weight (top 10% share)
  const sortedPoints = [...series.points].sort((a, b) => b.weight - a.weight);
  const top10PercentCount = Math.max(1, Math.ceil(sortedPoints.length * 0.1));
  const top10PercentWeight = sortedPoints
    .slice(0, top10PercentCount)
    .reduce((sum, p) => sum + p.weight, 0);
  const tailWeight = top10PercentWeight / (stats.totalWeight + 0.1);

  // Map shape to determinism-emergence
  let shapeScore = 0.5; // Neutral default
  if (shape === 'normal') {
    shapeScore = 0.2; // Normal = more determinism
  } else if (shape === 'log_normal') {
    shapeScore = 0.6; // Log-normal = moderate emergence
  } else if (shape === 'power_law') {
    shapeScore = 0.9; // Power-law = high emergence
  }

  // Combine signals (weighted average)
  // Higher variance, lower skew, higher tail weight, power-law shape = more emergence
  const varianceContribution = normalizedVariance * 0.3;
  const skewContribution = (1 - skewRatio) * 0.2; // Inverted: lower skew = more emergence
  const tailContribution = tailWeight * 0.3;
  const shapeContribution = shapeScore * 0.2;

  const emergenceScore = Math.max(0, Math.min(1, 
    varianceContribution + skewContribution + tailContribution + shapeContribution
  ));

  return emergenceScore;
}

const TONE_COPY = {
  calm: {
    determinismLabel: 'Determinism',
    emergenceLabel: 'Emergence',
    determinismDescription: 'reflects patterns shaped by repetition, habit, and constraint.',
    emergenceDescription: 'reflects moments where new structure appears without precedent.',
  },
  poetic: {
    determinismLabel: 'Determinism',
    emergenceLabel: 'Emergence',
    determinismDescription: 'reflects patterns shaped by repetition, habit, and constraint.',
    emergenceDescription: 'reflects moments where new structure appears without precedent.',
  },
  analytical: {
    determinismLabel: 'Determinism',
    emergenceLabel: 'Emergence',
    determinismDescription: 'reflects patterns shaped by repetition, habit, and constraint.',
    emergenceDescription: 'reflects moments where new structure appears without precedent.',
  },
  mirror: {
    determinismLabel: 'Determinism',
    emergenceLabel: 'Emergence',
    determinismDescription: 'reflects patterns shaped by repetition, habit, and constraint.',
    emergenceDescription: 'reflects moments where new structure appears without precedent.',
  },
};

export function DeterminismEmergenceAxis({ reflections, narrativeTone }: DeterminismEmergenceAxisProps) {
  const emergenceScore = useMemo(() => computeDeterminismEmergenceScore(reflections), [reflections]);
  const determinismScore = 1 - emergenceScore;
  
  const toneCopy = TONE_COPY[narrativeTone];

  // SVG dimensions
  const width = 600;
  const height = 120;
  const padding = { top: 20, right: 40, bottom: 40, left: 40 };
  const axisWidth = width - padding.left - padding.right;
  const axisY = height - padding.bottom;

  // Position marker on axis (0 = determinism, 1 = emergence)
  const markerX = padding.left + (emergenceScore * axisWidth);

  // Generate data points for visualization (representing reflection moments)
  const dataPoints = useMemo(() => {
    if (reflections.length === 0) return [];
    
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const windowReflections = filterEventsByWindow(reflections, start, now);
    
    // Sample up to 30 points for visualization
    const sampleSize = Math.min(30, windowReflections.length);
    const step = Math.max(1, Math.floor(windowReflections.length / sampleSize));
    
    return windowReflections
      .filter((_, i) => i % step === 0)
      .slice(0, sampleSize)
      .map((_, i) => {
        // Distribute points around the current score with some variation
        const base = emergenceScore;
        const variation = (Math.random() - 0.5) * 0.4; // ±0.2 variation
        const pointScore = Math.max(0, Math.min(1, base + variation));
        return {
          x: padding.left + (pointScore * axisWidth),
          y: axisY - 20 + (Math.random() * 20), // Scatter vertically
          size: 2 + Math.random() * 2, // Vary size slightly
        };
      });
  }, [reflections, emergenceScore]);

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="xMidYMid meet">
        {/* Axis line */}
        <line
          x1={padding.left}
          y1={axisY}
          x2={width - padding.right}
          y2={axisY}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.5"
        />

        {/* Determinism region (left side) */}
        <rect
          x={padding.left}
          y={axisY - 10}
          width={axisWidth * 0.5}
          height={20}
          fill="rgba(255, 255, 255, 0.02)"
          opacity={0.3}
        />

        {/* Emergence region (right side) */}
        <rect
          x={padding.left + axisWidth * 0.5}
          y={axisY - 10}
          width={axisWidth * 0.5}
          height={20}
          fill="rgba(16, 185, 129, 0.05)"
          opacity={0.3}
        />

        {/* Data points (reflection moments) */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={point.size}
            fill="rgba(255, 255, 255, 0.2)"
            opacity={0.6}
          />
        ))}

        {/* Main marker (current position) */}
        <circle
          cx={markerX}
          cy={axisY}
          r={4}
          fill="rgba(16, 185, 129, 0.6)"
          stroke="rgba(16, 185, 129, 0.8)"
          strokeWidth="1.5"
          className="position-oscillate"
        />
        <line
          x1={markerX}
          y1={axisY}
          x2={markerX}
          y2={axisY - 25}
          stroke="rgba(16, 185, 129, 0.4)"
          strokeWidth="1"
          strokeDasharray="2,2"
        />

        {/* Labels */}
        <text
          x={padding.left}
          y={axisY + 20}
          textAnchor="start"
          fill="rgba(255, 255, 255, 0.5)"
          fontSize="11"
          fontWeight="500"
        >
          {toneCopy.determinismLabel}
        </text>
        <text
          x={width - padding.right}
          y={axisY + 20}
          textAnchor="end"
          fill="rgba(255, 255, 255, 0.5)"
          fontSize="11"
          fontWeight="500"
        >
          {toneCopy.emergenceLabel}
        </text>
      </svg>

      {/* Explanatory text */}
      <div className="mt-4 space-y-1">
        <p className="text-xs text-white/40 leading-relaxed">
          <span className="font-medium text-white/50">{toneCopy.determinismLabel}</span> {toneCopy.determinismDescription}
        </p>
        <p className="text-xs text-white/40 leading-relaxed">
          <span className="font-medium text-white/50">{toneCopy.emergenceLabel}</span> {toneCopy.emergenceDescription}
        </p>
      </div>
    </div>
  );
}

