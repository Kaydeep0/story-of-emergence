'use client';

import { useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { traceObserverView } from '@/app/lib/observer';
import type { InsightCardBase } from '@/app/lib/insights/normalizeCard';
import type { InsightDeltaCard } from '@/app/lib/insights/viewModels';

type InsightCard = InsightCardBase;

type Props = {
  insights: InsightCard[];
  deltas?: InsightDeltaCard[];
};

/**
 * Pure presentational component for displaying distribution insights
 * Read-only UI - no data fetching, no business logic
 * 
 * Observer trace: Tracks viewing without influencing inference.
 * Epistemic firewall: Observer trace is descriptive only.
 */
export function InsightPanel({ insights, deltas = [] }: Props) {
  const { address } = useAccount();

  // Sort insights by scope priority: year → month → week
  // Within same scope, keep original order
  const sortedInsights = useMemo(() => {
    const scopePriority: Record<InsightCard['scope'], number> = {
      year: 0,
      month: 1,
      week: 2,
    };

    return [...insights].sort((a, b) => {
      const priorityA = scopePriority[a.scope];
      const priorityB = scopePriority[b.scope];
      return priorityA - priorityB;
    });
  }, [insights]);

  // Group deltas by scope for rendering beneath matching insights
  const deltasByScope = useMemo(() => {
    const grouped = new Map<InsightDeltaCard['scope'], InsightDeltaCard[]>();
    for (const delta of deltas) {
      const existing = grouped.get(delta.scope) || [];
      grouped.set(delta.scope, [...existing, delta]);
    }
    return grouped;
  }, [deltas]);

  // Observer trace: Track viewing without influencing inference
  // Passive only - no UI indicators, no feedback loops
  useEffect(() => {
    if (!address || sortedInsights.length === 0) {
      return;
    }

    // Trace each insight view (passive observation only)
    sortedInsights.forEach(insight => {
      traceObserverView(insight.id, address);
    });
  }, [address, sortedInsights]);

  if (sortedInsights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {sortedInsights.map((insight, index) => {
        const scopeDeltas = deltasByScope.get(insight.scope) || [];
        // Ensure stable unique key: coerce id to string, fallback to scope+index
        const stableId = typeof insight.id === 'string' ? insight.id : JSON.stringify(insight.id ?? {});
        const uniqueKey = `${insight.scope}:${stableId}:${index}`;
        return (
          <div key={uniqueKey} className="space-y-3">
            {/* Insight Card */}
            <div className="border border-gray-200 rounded p-4 bg-white">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{insight.headline}</h3>
                  {insight.label && (
                    <p className="text-xs text-gray-500 mb-2">{insight.label}</p>
                  )}
                  <p className="text-sm text-gray-600 leading-relaxed">{insight.summary}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <ConfidenceBadge confidence={insight.confidence} />
                  <ScopeLabel scope={insight.scope} />
                </div>
              </div>
            </div>

            {/* Deltas for this scope */}
            {scopeDeltas.length > 0 && (
              <div className="ml-4 space-y-2 border-l-2 border-gray-100 pl-4">
                {scopeDeltas.map((delta, deltaIndex) => {
                  const deltaStableId = typeof delta.id === 'string' ? delta.id : JSON.stringify(delta.id ?? {});
                  const deltaKey = `${delta.scope}:${deltaStableId}:${deltaIndex}`;
                  return (
                  <div key={deltaKey} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-500 mt-0.5 shrink-0">
                      <DirectionIcon direction={delta.direction} />
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{delta.headline}</p>
                      <p className="text-gray-600 mt-0.5">{delta.summary}</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Confidence badge component
 * Input is guaranteed to be normalized by normalizeInsightCard
 */
function ConfidenceBadge({ confidence }: { confidence: InsightCard['confidence'] }) {
  const label = confidence.charAt(0).toUpperCase() + confidence.slice(1);

  const colorClass =
    confidence === 'high'
      ? 'bg-gray-800 text-white'
      : confidence === 'low'
      ? 'bg-gray-200 text-gray-800'
      : 'bg-gray-500 text-white';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colorClass}`}>
      {label}
    </span>
  );
}

/**
 * Scope label component
 * Input is guaranteed to be normalized by normalizeInsightCard
 */
function ScopeLabel({ scope }: { scope: InsightCard['scope'] }) {
  const label = scope.charAt(0).toUpperCase() + scope.slice(1);
  return <span className="text-xs text-gray-500 font-medium">{label}</span>;
}

/**
 * Direction icon component
 */
function DirectionIcon({ direction }: { direction: InsightDeltaCard['direction'] }) {
  switch (direction) {
    case 'intensifying':
      return <span>↑</span>;
    case 'stabilizing':
      return <span>→</span>;
    case 'fragmenting':
      return <span>↯</span>;
    case 'no_change':
      return <span>—</span>;
    default:
      return <span>—</span>;
  }
}

