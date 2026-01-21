/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical insight components
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

// src/app/components/InsightsFromSources.tsx
'use client';

import type { UnifiedSourceInsights } from '../lib/insights/fromSources';

type Props = {
  insights: UnifiedSourceInsights | null;
  hasSources: boolean;
};

export function InsightsFromSources({ insights, hasSources }: Props) {
  if (!hasSources) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white/90">Insights from External Sources</h3>
        <p className="text-sm text-white/60">Connect or import sources to see insights here.</p>
      </div>
    );
  }

  if (!insights || insights.topWords.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white/90">Insights from External Sources</h3>
        <p className="text-sm text-white/60">No insights yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white/90">Insights from External Sources</h3>

      <div className="space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wide">Themes</p>
        {insights.themes.length === 0 ? (
          <p className="text-sm text-white/60">No themes yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {insights.themes.map((theme) => (
              <span
                key={theme}
                className="text-xs text-white/80 bg-white/10 border border-white/15 rounded-full px-2 py-1"
              >
                {theme}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wide">Top words</p>
        {insights.topWords.length === 0 ? (
          <p className="text-sm text-white/60">No words yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {insights.topWords.map((t) => (
              <span
                key={t.word}
                className="text-xs text-white/80 bg-white/10 border border-white/15 rounded-full px-2 py-1"
              >
                {t.word} · {t.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wide">Highlights</p>
        {insights.highlights.length === 0 ? (
          <p className="text-sm text-white/60">No highlights yet.</p>
        ) : (
          <div className="space-y-2">
            {insights.highlights.map((h) => (
              <div
                key={h.sourceId}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1"
              >
                <p className="text-xs text-white/50">
                  {h.sourceTitle || h.sourceId}
                </p>
                <ul className="space-y-1">
                  {h.items.map((item, idx) => (
                    <li key={`${h.sourceId}-${idx}`} className="text-sm text-white/80 truncate">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
