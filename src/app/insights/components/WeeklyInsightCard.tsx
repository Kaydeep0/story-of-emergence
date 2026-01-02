// src/app/insights/components/WeeklyInsightCard.tsx
// Weekly Insight Card Component
// Phase 6.1a: Renders weekly insight card with optional pattern narratives
// Phase 6.2: Add expand/collapse toggle for narratives (UI-only)
// Phase 6.4: Uses shared NarrativeBlock component

import { useState } from 'react';
import type { WeeklyInsight } from '../../lib/weeklyInsights';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';
import { NarrativeBlock } from './NarrativeBlock';

interface WeeklyInsightCardProps {
  insight: WeeklyInsight;
  artifact?: InsightArtifact | null;
  formatWeekDate: (date: Date) => string;
}

export function WeeklyInsightCard({ insight, artifact, formatWeekDate }: WeeklyInsightCardProps) {
  // Phase 6.2: Local UI-only state for expand/collapse
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Phase 6.1a: Safe narrative extraction with guards
  const narratives = artifact?.narratives ?? [];
  // Phase 6.2: Show first narrative when collapsed, up to 2 when expanded
  const visible = isExpanded ? narratives.slice(0, 2) : narratives.slice(0, 1);

  return (
    <div className="rounded-2xl border border-white/10 p-6 mb-8 space-y-4">
      <h2 className="text-lg font-medium">
        Week of {formatWeekDate(insight.startDate)}
      </h2>

      <div className="space-y-3 text-sm text-white/70">
        {insight.journalEvents === 0 ? (
          <p>Sparse reflective activity observed this week.</p>
        ) : insight.topGuessedTopics.length === 0 ? (
          <p>Reflections during this period span multiple themes without a dominant focus.</p>
        ) : insight.topGuessedTopics.length === 1 ? (
          <p>Reflections appear concentrated around a single theme.</p>
        ) : insight.topGuessedTopics.length <= 3 ? (
          <p>Reflections during this period span multiple themes.</p>
        ) : (
          <p>Reflections during this period span multiple themes.</p>
        )}
        {insight.distributionLabel && (
          <p>
            {insight.distributionLabel === 'normal' || insight.distributionLabel === 'lognormal'
              ? 'Activity appears distributed across time.'
              : insight.distributionLabel === 'powerlaw'
              ? 'Activity clustered around a small number of reflections.'
              : 'Activity appears distributed across time.'}
          </p>
        )}
      </div>

      {insight.topGuessedTopics.length > 0 && (
        <div>
          <div className="text-xs text-white/50 mb-2">Observed Patterns</div>
          <div className="flex flex-wrap gap-2">
            {insight.topGuessedTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-white/10 px-3 py-1 text-xs"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {insight.summaryText && (
        <div>
          <div className="text-xs text-white/50 mb-2">Summary</div>
          <p className="text-sm text-white/70 leading-relaxed">
            {insight.summaryText}
          </p>
          {insight.distributionLabel && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="font-medium text-white/80">Pattern</span>
              <span>{insight.distributionLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* Phase 6.1a-6.2-6.4: Render pattern narratives using shared component */}
      {narratives.length > 0 && (
        <>
          <NarrativeBlock narratives={visible} maxNarratives={visible.length} showToggle={false} />
          {/* Phase 6.2: Expand/collapse toggle (only show if more than 1 narrative) */}
          {narratives.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              {isExpanded ? 'Hide context' : 'Show more context'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

