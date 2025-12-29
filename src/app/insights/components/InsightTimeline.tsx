'use client';

import { useMemo } from 'react';
import type { InsightCard, InsightDeltaCard } from '@/app/lib/insights/viewModels';

type Props = {
  insights: InsightCard[];
  deltas?: InsightDeltaCard[];
};

/**
 * Pure presentational component for displaying distribution insights in a timeline layout
 * Read-only UI - no data fetching, no mutations, pure layout logic
 */
export function InsightTimeline({ insights, deltas = [] }: Props) {
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
                  
                  return (
                    <div key={insight.id} className="space-y-3">
                      {/* Insight card */}
                      <div className="border-l-2 border-gray-200 pl-4 py-2">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">{insight.headline}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{insight.summary}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <ConfidenceBadge confidence={insight.confidence} />
                          </div>
                        </div>
                      </div>

                      {/* Deltas for this scope (render after last insight) */}
                      {isLastInsight && scopeDeltas.length > 0 && (
                        <div className="ml-4 space-y-2 border-l-2 border-gray-100 pl-4">
                          {scopeDeltas.map((delta) => (
                            <div key={delta.id} className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500 mt-0.5 shrink-0">
                                <DirectionIcon direction={delta.direction} />
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{delta.headline}</p>
                                <p className="text-gray-600 mt-0.5">{delta.summary}</p>
                              </div>
                            </div>
                          ))}
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
 */
function ConfidenceBadge({ confidence }: { confidence: InsightCard['confidence'] }) {
  const label = confidence.charAt(0).toUpperCase() + confidence.slice(1);
  const colorClass =
    confidence === 'high'
      ? 'bg-gray-800 text-white'
      : confidence === 'medium'
      ? 'bg-gray-200 text-gray-800'
      : 'bg-gray-100 text-gray-600';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}>
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

