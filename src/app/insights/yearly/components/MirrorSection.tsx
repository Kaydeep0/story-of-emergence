'use client';

import { useState } from 'react';

interface MirrorSectionProps {
  mirrorInsights: {
    keywords: string[];
    wordShift: {
      rising: Array<{ word: string; score: number }>;
      fading: Array<{ word: string; score: number }>;
    };
    moments: Array<{ date: string; preview: string }>;
  } | null;
  formatDate: (dateStr: string) => string;
}

export function MirrorSection({ mirrorInsights, formatDate }: MirrorSectionProps) {
  const [showDeeperPatterns, setShowDeeperPatterns] = useState(false);

  if (!mirrorInsights) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold mb-6">Mirror: what you wrote about</h2>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recurring words - always visible */}
        <div>
          <h3 className="text-sm font-semibold text-white/90 mb-3">Recurring words</h3>
          {mirrorInsights.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mirrorInsights.keywords.map((word) => (
                <span
                  key={word}
                  className="px-2 py-1 rounded-lg bg-white/10 text-white/80 text-xs"
                >
                  {word}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/60">Write a few more reflections to see themes appear here.</p>
          )}
        </div>

        {/* Three moments - always visible */}
        <div>
          <h3 className="text-sm font-semibold text-white/90 mb-3">Three moments</h3>
          {mirrorInsights.moments.length > 0 ? (
            <div className="space-y-3">
              {mirrorInsights.moments.slice(0, 3).map((moment) => (
                <div key={moment.date} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="text-xs text-white/60 mb-1">{formatDate(moment.date)}</div>
                  <p className="text-xs text-white/80 leading-relaxed">{moment.preview}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/60">Not enough entries yet.</p>
          )}
        </div>
      </div>

      {/* Toggle for deeper patterns */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={() => setShowDeeperPatterns(!showDeeperPatterns)}
          className="text-xs text-white/60 hover:text-white/80 transition-colors flex items-center gap-1 mb-4"
        >
          <span>{showDeeperPatterns ? 'Hide' : 'Show'} deeper patterns</span>
          <svg
            className={`w-3 h-3 transition-transform ${showDeeperPatterns ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Word shift - hidden by default */}
        {showDeeperPatterns && mirrorInsights.wordShift.rising.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/90 mb-3">Your shift this year</h3>
            <div className="space-y-3">
              {mirrorInsights.wordShift.rising.length > 0 && (
                <div>
                  <div className="text-xs text-white/60 mb-1">Rising</div>
                  <div className="flex flex-wrap gap-2">
                    {mirrorInsights.wordShift.rising.map(({ word }) => (
                      <span
                        key={word}
                        className="px-2 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {mirrorInsights.wordShift.fading.length > 0 && (
                <div>
                  <div className="text-xs text-white/60 mb-1">Fading</div>
                  <div className="flex flex-wrap gap-2">
                    {mirrorInsights.wordShift.fading.map(({ word }) => (
                      <span
                        key={word}
                        className="px-2 py-1 rounded-lg bg-white/10 text-white/50 text-xs"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

