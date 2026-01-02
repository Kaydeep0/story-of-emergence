// src/app/insights/components/NarrativeBlock.tsx
// Shared component for rendering pattern narratives with evidence hints
// Phase 6.4: Extracted from WeeklyInsightCard for reuse across insight types

import type { PatternNarrative } from '../../lib/patternMemory/patternNarratives';

interface NarrativeBlockProps {
  /** Array of narratives to render (empty array renders nothing) */
  narratives: PatternNarrative[];
  /** Maximum number of narratives to show (default: 2) */
  maxNarratives?: number;
  /** Whether to show expand/collapse toggle (default: true if narratives.length > 1) */
  showToggle?: boolean;
}

export function NarrativeBlock({ narratives, maxNarratives = 2, showToggle }: NarrativeBlockProps) {
  // Guard: render nothing if no narratives
  if (narratives.length === 0) {
    return null;
  }

  // Determine if toggle should be shown
  const shouldShowToggle = showToggle !== false && narratives.length > 1;

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      {narratives.slice(0, maxNarratives).map((narrative, index) => {
        // Phase 6.3: Check for evidence metadata (guard safely)
        const hasEvidence = (narrative.evidence?.length ?? 0) > 0;

        return (
          <div key={narrative.id ?? `narrative-${index}`} className="mb-3 last:mb-0">
            <p className="text-xs text-white/60 mb-1">{narrative.title}</p>
            <p className="text-sm text-white/70 leading-relaxed">{narrative.body}</p>

            {/* Phase 6.3: Evidence hint (only render if evidence exists) */}
            {hasEvidence && (
              <details className="mt-2">
                <summary className="text-xs text-white/40 cursor-pointer hover:text-white/50 transition-colors">
                  Why this insight?
                </summary>
                <p className="mt-1 text-xs text-white/40 leading-relaxed">
                  This insight is generated from recurring language and timing patterns in your recent reflections.
                </p>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

