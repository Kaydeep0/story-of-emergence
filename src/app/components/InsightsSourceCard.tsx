// src/app/components/InsightsSourceCard.tsx
'use client';

import { computeSourceWordFreq } from '../lib/insights/fromSources';
import type { ReflectionEntry } from '../lib/insights/types';
import type { SourceEntryLite } from '../lib/insights/fromSources';

type Props = {
  source: SourceEntryLite;
  reflections: ReflectionEntry[];
  highlight?: string;
};

export function InsightsSourceCard({ source, reflections, highlight }: Props) {
  const words = computeSourceWordFreq(reflections, 3);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate">
            {source.title || 'Untitled source'}
          </p>
        </div>
        {source.kind && (
          <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">
            {source.kind}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {words.length === 0 ? (
          <span className="text-xs text-white/50">No words yet.</span>
        ) : (
          words.map((w) => (
            <span
              key={w.word}
              className="text-xs text-white/80 bg-white/10 border border-white/15 rounded-full px-2 py-1"
            >
              {w.word} · {w.count}
            </span>
          ))
        )}
      </div>
      <div className="text-sm text-white/70">
        {highlight || 'No highlight yet.'}
      </div>
    </div>
  );
}
