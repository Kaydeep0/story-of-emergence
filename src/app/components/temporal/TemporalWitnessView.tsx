'use client';

import type { TemporalWitness } from '../../lib/temporal/witnessTemporalPatterns';

type Props = {
  witness: TemporalWitness;
};

/**
 * Temporal Witness View
 * 
 * Non-narrative presentation of temporal patterns.
 * 
 * Shows:
 * - Density bands (compression/expansion)
 * - Clustering (recurrence patterns)
 * 
 * Does NOT show:
 * - Timelines
 * - Sequences
 * - Arrows
 * - Start or end emphasis
 * - Narrative or causality
 * 
 * Visual grammar:
 * - Muted colors
 * - Reduced opacity
 * - No directional indicators
 * - Silence preserved (sparse periods remain visually quiet)
 */
export function TemporalWitnessView({ witness }: Props) {
  if (witness.totalReflections === 0) {
    // Silence preserved - no placeholders, no explanatory text
    return null;
  }

  // Normalize density bands for visual representation
  const maxDensity = Math.max(...witness.densityBands.map(b => b.density), 0.1);
  
  return (
    <div className="mb-16 pt-12 border-t border-gray-200">
      <h3 className="text-sm font-normal text-gray-600 mb-6">Temporal patterns</h3>
      
      {/* Density bands - compression/expansion visualization */}
      {witness.densityBands.length > 0 && (
        <div className="mb-8">
          <div className="flex items-end gap-1 h-24">
            {witness.densityBands.map((band, index) => {
              // Visual grammar: muted colors, reduced opacity, no emphasis
              const height = (band.density / maxDensity) * 100;
              const opacity = 0.4 + (band.density * 0.4); // 0.4 to 0.8 opacity range
              
              return (
                <div
                  key={`${band.periodStart}-${index}`}
                  className="flex-1 bg-gray-400 rounded-t"
                  style={{
                    height: `${Math.max(height, 2)}%`,
                    opacity,
                    minHeight: '2px',
                  }}
                  title={`${band.reflectionCount} reflection${band.reflectionCount !== 1 ? 's' : ''}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Recurrence clustering - non-narrative presentation */}
      {witness.recurrence.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {witness.recurrence.map((rec) => {
              // Visual grammar: muted colors, reduced opacity, no emphasis
              const opacity = 0.3 + (rec.density * 0.4); // 0.3 to 0.7 opacity range
              
              return (
                <div
                  key={rec.period}
                  className="text-xs text-gray-500 px-2 py-1 rounded"
                  style={{
                    backgroundColor: `rgba(156, 163, 175, ${opacity * 0.2})`, // gray-400 with low opacity
                    opacity,
                  }}
                >
                  {rec.period}: {rec.reflectionCount}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacing information - minimal, non-narrative */}
      {witness.spacing.averageDaysBetween > 0 && (
        <div className="text-xs text-gray-400 opacity-60">
          Average spacing: {witness.spacing.averageDaysBetween.toFixed(1)} days
        </div>
      )}
    </div>
  );
}

