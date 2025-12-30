'use client';

import { useState } from 'react';
import { computeActiveDays } from '../../../lib/insights/distributionLayer';
import type { DistributionResult, WindowDistribution } from '../../../lib/insights/distributionLayer';

interface UnderlyingRhythmCardProps {
  distributionResult: DistributionResult;
  windowDistribution: WindowDistribution;
  mostCommonDayCount: number | null;
  formatClassification: (classification: string) => string;
  readOnly?: boolean; // Hide toggle button in share view, show all details
}

export function UnderlyingRhythmCard({
  distributionResult,
  windowDistribution,
  mostCommonDayCount,
  formatClassification,
  readOnly = false,
}: UnderlyingRhythmCardProps) {
  const [showDetails, setShowDetails] = useState(readOnly); // Show details by default in read-only mode
  const activeDays = computeActiveDays(distributionResult.dailyCounts);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold mb-4">What repeated itself</h2>
      
      {/* Primary metrics - always visible */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-white/60 mb-1">Active Days</div>
          <div className="text-2xl font-bold text-white">{activeDays}</div>
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Spike Ratio</div>
          <div className="text-2xl font-bold text-white">{distributionResult.stats.spikeRatio.toFixed(1)}x</div>
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Pattern</div>
          <div className="text-lg font-semibold text-white">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              windowDistribution.classification === 'normal' 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : windowDistribution.classification === 'lognormal'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
            }`}>
              {formatClassification(windowDistribution.classification)}
            </span>
          </div>
        </div>
      </div>

      {/* Toggle for details - hidden in read-only mode */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-white/60 hover:text-white/80 transition-colors flex items-center gap-1"
        >
          <span>{showDetails ? 'Hide' : 'View'} details</span>
          <svg
            className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Details - shown by default in read-only mode */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-white/60 mb-1">Total Entries</div>
              <div className="text-xl font-bold text-white">{distributionResult.totalEntries}</div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">Top 10% Days Share</div>
              <div className="text-xl font-bold text-white">{(distributionResult.stats.top10PercentDaysShare * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">Variance</div>
              <div className="text-xl font-bold text-white">{distributionResult.stats.variance.toFixed(2)}</div>
            </div>
            {mostCommonDayCount !== null && (
              <div>
                <div className="text-xs text-white/60 mb-1">Most Common Day</div>
                <div className="text-xl font-bold text-white">{mostCommonDayCount}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

