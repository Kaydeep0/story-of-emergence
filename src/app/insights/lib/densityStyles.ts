// src/app/insights/lib/densityStyles.ts
// Utility functions for density-based styling

import type { DensityMode } from '../hooks/useDensity';

export function getCardPadding(density: DensityMode): string {
  return density === 'dense' ? 'p-4' : 'p-6';
}

export function getCardSpacing(density: DensityMode): string {
  return density === 'dense' ? 'space-y-3' : 'space-y-4';
}

export function getSectionSpacing(density: DensityMode): string {
  return density === 'dense' ? 'mb-4' : 'mb-6';
}

export function getChartHeight(density: DensityMode, baseHeight: number = 56): number {
  return density === 'dense' ? Math.floor(baseHeight * 0.75) : baseHeight;
}

export function getChartProminence(density: DensityMode): string {
  return density === 'dense' ? 'opacity-60' : 'opacity-100';
}

export function getTextSize(density: DensityMode, baseSize: 'xs' | 'sm' | 'base'): string {
  if (density === 'dense') {
    switch (baseSize) {
      case 'base': return 'text-sm';
      case 'sm': return 'text-xs';
      case 'xs': return 'text-xs';
      default: return `text-${baseSize}`;
    }
  }
  return `text-${baseSize}`;
}

export function getCopyVerbosity(density: DensityMode, fullText: string, conciseText?: string): string {
  if (density === 'dense' && conciseText) {
    return conciseText;
  }
  return fullText;
}

export function getChipSpacing(density: DensityMode): string {
  return density === 'dense' ? 'gap-1.5' : 'gap-2';
}

export function getGridGap(density: DensityMode): string {
  return density === 'dense' ? 'gap-3' : 'gap-4';
}

