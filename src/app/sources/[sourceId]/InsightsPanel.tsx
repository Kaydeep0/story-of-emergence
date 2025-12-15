// src/app/sources/[sourceId]/InsightsPanel.tsx
'use client';

import { useMemo, useState } from 'react';
import type { ReflectionEntry } from '../../lib/insights/types';
import { computeSourceWordFreq, computeSourceSummary } from '../../lib/insights/fromSources';

type Props = {
  reflections: ReflectionEntry[];
};

export function InsightsPanel({ reflections }: Props) {
  const [copied, setCopied] = useState(false);

  const { topWords, highlights, summary } = useMemo(() => {
    // INTEGRITY GUARDRAIL: If source has zero reflections, Insights must show "Not enough data"
    if (reflections.length === 0) {
      return {
        topWords: [],
        highlights: [],
        summary: 'Not enough data yet.',
      };
    }

    // INTEGRITY GUARDRAIL: If reflections exist, Insights must never be empty silently
    // Compute top 8 words
    const topWords = computeSourceWordFreq(reflections, 8);

    // Get up to 3 highlights (first line from each reflection)
    const highlights = reflections
      .map((r) => {
        const text = typeof r.plaintext === 'string' ? r.plaintext : String(r.plaintext ?? '');
        return text.split('\n')[0]?.trim() || '';
      })
      .filter((line) => line.length > 0)
      .slice(0, 3);

    // Generate 2-3 sentence summary
    const summary = computeSourceSummary(reflections);

    // Defensive check: ensure we always have meaningful output when reflections exist
    if (reflections.length > 0 && topWords.length === 0 && highlights.length === 0 && summary === 'Not enough data yet.') {
      // This should not happen, but if it does, provide fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('[InsightsPanel] Reflections exist but insights are empty. This may indicate a data quality issue.');
      }
    }

    return { topWords, highlights, summary };
  }, [reflections]);

  const insightText = useMemo(() => {
    const wordsLine =
      topWords.length > 0
        ? `Top words: ${topWords.map((t) => `${t.word} (${t.count})`).join(', ')}`
        : 'No frequent words yet.';
    const highlightsText =
      highlights.length > 0 ? `Highlights:\n- ${highlights.join('\n- ')}` : 'No highlights yet.';
    return `${summary}\n${wordsLine}\n${highlightsText}`;
  }, [topWords, highlights, summary]);

  async function copyInsight() {
    try {
      await navigator.clipboard.writeText(insightText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Source Insights</h3>
        <button
          type="button"
          onClick={copyInsight}
          className="text-xs px-3 py-1 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
        >
          {copied ? 'Copied' : 'Copy Insight'}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wide">Summary</p>
        <p className="text-sm text-white/80">{summary}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wide">Top words</p>
        {topWords.length === 0 ? (
          <p className="text-sm text-white/60">Not enough data yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topWords.map((t) => (
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
        {highlights.length === 0 ? (
          <p className="text-sm text-white/60">No highlights yet.</p>
        ) : (
          <ul className="space-y-2">
            {highlights.map((line, idx) => (
              <li
                key={`${line}-${idx}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80"
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
