// src/app/sources/[sourceId]/InsightsPanel.tsx
'use client';

import { useMemo, useState } from 'react';
import type { ReflectionEntry } from '../../lib/insights/types';

type Props = {
  reflections: ReflectionEntry[];
};

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','for','to','of','in','on','at','by','with','about','into','over','after','before','between','so','than','too','very','can','just','from','up','out','as','is','are','was','were','be','been','being','that','this','those','these','it','its','i','me','my','you','your','we','our','they','them','their'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function InsightsPanel({ reflections }: Props) {
  const [copied, setCopied] = useState(false);

  const { topWords, highlights, summary } = useMemo(() => {
    const allText = reflections.map((r) => r.plaintext || '').join(' ');
    const tokens = tokenize(allText);

    const freq = new Map<string, number>();
    tokens.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));

    const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    const topWords = sorted.slice(0, 5).map(([word, count]) => ({ word, count }));

    const highlights = reflections
      .map((r) => (typeof r.plaintext === 'string' ? r.plaintext.split('\n')[0] : ''))
      .filter((line) => line.trim().length > 0)
      .slice(0, 2);

    const summary =
      topWords.length > 0
        ? `Themes: ${topWords.map((t) => t.word).join(', ')}`
        : 'Not enough data yet.';

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
