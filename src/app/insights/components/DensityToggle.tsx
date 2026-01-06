// src/app/insights/components/DensityToggle.tsx
// Toggle component for switching between Dense and Spacious modes

'use client';

import React from 'react';
import type { DensityMode } from '../hooks/useDensity';

interface DensityToggleProps {
  density: DensityMode;
  onDensityChange: (newDensity: DensityMode) => void;
}

export function DensityToggle({ density, onDensityChange }: DensityToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="density-toggle" className="sr-only">Visual Density</label>
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => onDensityChange('dense')}
          className={`px-2 py-1 text-xs rounded transition-colors button-haptic ${
            density === 'dense'
              ? 'bg-white/10 text-white/90'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          Dense
        </button>
        <button
          type="button"
          onClick={() => onDensityChange('spacious')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            density === 'spacious'
              ? 'bg-white/10 text-white/90'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          Spacious
        </button>
      </div>
    </div>
  );
}

