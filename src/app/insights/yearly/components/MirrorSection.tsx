'use client';

import { useState, useMemo } from 'react';
import { pickTopMomentsForShare } from '../../../lib/share/buildShareText';
import type { ReflectionEntry } from '../../../lib/insights/types';
import { MomentEntryModal } from './MomentEntryModal';

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
  entries: ReflectionEntry[];
  topSpikeDates: string[];
}

export function MirrorSection({ mirrorInsights, formatDate, entries, topSpikeDates }: MirrorSectionProps) {
  const [showDeeperPatterns, setShowDeeperPatterns] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<{ entryId: string; date: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Create entriesById map for quick lookup - must be called before any early returns
  const entriesById = useMemo(() => {
    const map: Record<string, ReflectionEntry> = {};
    entries.forEach(entry => {
      map[entry.id] = entry;
    });
    return map;
  }, [entries]);

  if (!mirrorInsights) {
    return null;
  }

  // Use sanitized moments for display
  const safeMoments = pickTopMomentsForShare(entries, topSpikeDates, 3);

  const handleMomentClick = (moment: { entryId: string; date: string }) => {
    setSelectedMoment(moment);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedMoment(null);
  };

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
          <h3 className="text-sm font-semibold text-white/90 mb-1">Three moments</h3>
          <p className="text-xs text-white/50 mb-3">
            These moments reflect days with unusual activity, emotional density, or sustained focus.
          </p>
          {safeMoments.length > 0 ? (
            <div className="space-y-3">
              {safeMoments.map((moment) => (
                <button
                  key={moment.date}
                  type="button"
                  onClick={() => handleMomentClick(moment)}
                  className="w-full text-left rounded-lg border border-white/10 bg-black/30 p-3 hover:border-white/20 hover:bg-black/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black min-h-[80px]"
                >
                  <div className="text-xs text-white/60 mb-1">{formatDate(moment.date)}</div>
                  <p className="text-xs text-white/80 leading-relaxed">{moment.preview}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/30 p-4 min-h-[80px]">
              <div className="text-xs font-semibold text-white/90 mb-1">Moments will appear here</div>
              <p className="text-xs text-white/60 leading-relaxed">
                As you write, Story of Emergence will surface your strongest days automatically. Keep going.
              </p>
            </div>
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

      {/* Moment Entry Modal */}
      <MomentEntryModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        moment={selectedMoment}
        entriesById={entriesById}
        formatDate={formatDate}
      />
    </div>
  );
}

