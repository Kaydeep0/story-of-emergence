// src/app/insights/lib/intensitySystem.ts
// Unified visual language for intensity across all Insights components

export type IntensityLevel = 'low' | 'medium' | 'high';

/**
 * Compute intensity level from spike ratio
 */
export function intensityFromSpikeRatio(spikeRatio: number): IntensityLevel {
  if (spikeRatio >= 5) return 'high';
  if (spikeRatio >= 2.5) return 'medium';
  return 'low';
}

/**
 * Compute intensity level from top 10% share
 */
export function intensityFromTop10Share(sharePercent: number): IntensityLevel {
  if (sharePercent >= 50) return 'high';
  if (sharePercent >= 30) return 'medium';
  return 'low';
}

/**
 * Compute intensity level from entry count and scope
 */
export function intensityFromEntryCount(count: number, scope: 'week' | 'month' | 'year'): IntensityLevel {
  if (scope === 'week') {
    if (count >= 20) return 'high';
    if (count >= 10) return 'medium';
    return 'low';
  } else if (scope === 'month') {
    if (count >= 50) return 'high';
    if (count >= 20) return 'medium';
    return 'low';
  } else {
    if (count >= 200) return 'high';
    if (count >= 100) return 'medium';
    return 'low';
  }
}

/**
 * Compute intensity level from variance
 */
export function intensityFromVariance(variance: number): IntensityLevel {
  if (variance >= 10) return 'high';
  if (variance >= 5) return 'medium';
  return 'low';
}

/**
 * Get unified color for intensity level
 * Saturation increases with intensity
 */
export function getIntensityColor(intensity: IntensityLevel, alpha: number = 1): string {
  switch (intensity) {
    case 'high':
      return `rgba(16, 185, 129, ${alpha})`; // Full saturation emerald
    case 'medium':
      return `rgba(16, 185, 129, ${alpha * 0.6})`; // Medium saturation
    case 'low':
      return `rgba(16, 185, 129, ${alpha * 0.3})`; // Low saturation
  }
}

/**
 * Get unified glow filter for intensity level
 * Glow strength scales with intensity
 */
export function getIntensityGlow(intensity: IntensityLevel): string {
  switch (intensity) {
    case 'high':
      return 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))';
    case 'medium':
      return 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))';
    case 'low':
      return 'drop-shadow(0 0 2px rgba(16, 185, 129, 0.2))';
  }
}

/**
 * Get unified border color for intensity level
 */
export function getIntensityBorder(intensity: IntensityLevel): string {
  switch (intensity) {
    case 'high':
      return 'border-emerald-500/40';
    case 'medium':
      return 'border-emerald-500/25';
    case 'low':
      return 'border-emerald-500/15';
  }
}

/**
 * Get unified background color for intensity level (for pills/chips)
 */
export function getIntensityBackground(intensity: IntensityLevel): string {
  switch (intensity) {
    case 'high':
      return 'bg-emerald-500/15 border-emerald-500/30';
    case 'medium':
      return 'bg-emerald-500/10 border-emerald-500/20';
    case 'low':
      return 'bg-emerald-500/5 border-emerald-500/10';
  }
}

/**
 * Get unified text color for intensity level
 */
export function getIntensityText(intensity: IntensityLevel): string {
  switch (intensity) {
    case 'high':
      return 'text-emerald-300/90';
    case 'medium':
      return 'text-emerald-300/70';
    case 'low':
      return 'text-emerald-300/50';
  }
}

/**
 * Get bar opacity for intensity level
 * Higher intensity = higher opacity
 */
export function getIntensityBarOpacity(intensity: IntensityLevel): number {
  switch (intensity) {
    case 'high':
      return 0.8;
    case 'medium':
      return 0.5;
    case 'low':
      return 0.3;
  }
}

/**
 * Get dot size for intensity level
 * Higher intensity = larger dot
 */
export function getIntensityDotSize(intensity: IntensityLevel): number {
  switch (intensity) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1.5;
  }
}

/**
 * Get bar density multiplier for intensity level
 * Higher intensity = denser bars (less gap)
 */
export function getIntensityBarDensity(intensity: IntensityLevel): number {
  switch (intensity) {
    case 'high':
      return 0.95; // Very dense (5% gap)
    case 'medium':
      return 0.9; // Medium density (10% gap)
    case 'low':
      return 0.85; // Less dense (15% gap)
  }
}

