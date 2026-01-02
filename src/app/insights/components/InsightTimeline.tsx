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
 * Pure presentational component for displaying distribution insights in a timeline layout
 * Read-only UI - no data fetching, no mutations, pure layout logic
 * 
 * Observer trace: Tracks viewing without influencing inference.
 * Epistemic firewall: Observer trace is descriptive only.
 */
export function InsightTimeline({ insights, deltas = [] }: Props) {
  const { address } = useAccount();

  // Group insights by scope
  const groupedInsights = useMemo(() => {
    const groups = new Map<InsightCard['scope'], InsightCard[]>();
    
    for (const insight of insights) {
      const existing = groups.get(insight.scope) || [];
      groups.set(insight.scope, [...existing, insight]);
    }
    
    // Return in priority order: year → month → week
    const scopeOrder: InsightCard['scope'][] = ['year', 'month', 'week'];
    return scopeOrder
      .filter(scope => groups.has(scope))
      .map(scope => ({
        scope,
        insights: groups.get(scope)!,
      }));
  }, [insights]);

  // Group deltas by scope for quick lookup
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
    if (!address || insights.length === 0) {
      return;
    }

    // Trace each insight view (passive observation only)
    insights.forEach(insight => {
      traceObserverView(insight.id, address);
    });
  }, [address, insights]);

  if (groupedInsights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {groupedInsights.map((group, groupIndex) => {
        const scopeDeltas = deltasByScope.get(group.scope) || [];
        
        return (
          <div key={group.scope} className="relative">
            {/* Scope label rail */}
            <div className="flex gap-6">
              <div className="w-20 shrink-0 pt-1">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {group.scope === 'year' ? 'Year' : group.scope === 'month' ? 'Month' : 'Week'}
                </div>
              </div>
              
              {/* Content panel */}
              <div className="flex-1 space-y-4">
                {group.insights.map((insight, insightIndex) => {
                  // Render deltas after the last insight in the group
                  const isLastInsight = insightIndex === group.insights.length - 1;
                  // Ensure stable unique key
                  const stableId = typeof insight.id === 'string' ? insight.id : JSON.stringify(insight.id ?? {});
                  const uniqueKey = `${group.scope}:${stableId}:${insightIndex}`;
                  
                  return (
                    <div key={uniqueKey} className="space-y-3">
                      {/* Insight card */}
                      <div className="border-l-2 border-gray-200 pl-4 py-2">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">{insight.headline}</h3>
                            {insight.label && (
                              <p className="text-xs text-gray-500 mb-2">{insight.label}</p>
                            )}
                            <p className="text-sm text-gray-600 leading-relaxed">{insight.summary}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <ConfidenceBadge confidence={insight.confidence ?? 'medium'} />
                          </div>
                        </div>
                      </div>

                      {/* Deltas for this scope (render after last insight) */}
                      {isLastInsight && scopeDeltas.length > 0 && (
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
            </div>
            
            {/* Connector line between groups (except last) */}
            {groupIndex < groupedInsights.length - 1 && (
              <div className="absolute left-[39px] top-full w-0.5 h-8 bg-gray-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Confidence badge component
 * Defensive: handles undefined/null confidence gracefully
 */
function ConfidenceBadge({
  confidence,
}: {
  confidence?: InsightCard['confidence'] | string | null;
}) {
  const value = (confidence ?? 'medium').toString();
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Medium';

  const colorClass =
    value === 'high'
      ? 'bg-gray-800 text-white'
      : value === 'low'
      ? 'bg-gray-200 text-gray-800'
      : 'bg-gray-500 text-white';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colorClass}`}>
      {label}
    </span>
  );
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

