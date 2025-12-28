'use client';

import React, { useState, useEffect } from 'react';

interface IdentityLineProps {
  totalEntries: number;
  activeDays: number;
  spikeRatio: number;
  top10PercentShare: number;
  classification: 'normal' | 'lognormal' | 'powerlaw';
  onSentenceChange?: (sentence: string) => void;
  readOnly?: boolean; // Hide shuffle button in share view
}

export function IdentityLine({
  totalEntries,
  activeDays,
  spikeRatio,
  top10PercentShare,
  classification,
  onSentenceChange,
  readOnly = false,
}: IdentityLineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Generate 3 alternative sentences (tighter, sharper copy)
  const sentences = [
    // Sentence 1: Focus on rhythm pattern
    classification === 'lognormal'
      ? spikeRatio >= 4
        ? 'You moved quietly, then arrived decisively when it mattered.'
        : 'Steady baseline days, punctuated by deep dives. Your growth happened between sessions.'
      : classification === 'powerlaw'
      ? 'A few days carried everything. Your year was shaped by concentrated surges.'
      : 'You wrote with intention. Not constant, but concentrated.',

    // Sentence 2: Focus on consistency vs bursts
    spikeRatio >= 5
      ? 'You think between sessions, then return with intensity and clarity.'
      : top10PercentShare > 0.5
      ? `Your most intense days shaped ${Math.round(top10PercentShare * 100)}% of your year.`
      : `You showed up ${activeDays} days this year, building something steady.`,

    // Sentence 3: Focus on pattern interpretation
    spikeRatio >= 6
      ? 'Your bursts move mountains. A simple cadence makes them gentler.'
      : activeDays > 100
      ? 'Consistency was your superpower. Day by day, you built something real.'
      : 'Your writing found its rhythm: quiet consistency with occasional surges.',
  ];

  const currentSentence = sentences[currentIndex] || sentences[0];

  // Notify parent of sentence change on mount and when sentence changes
  useEffect(() => {
    onSentenceChange?.(currentSentence);
  }, [currentSentence, onSentenceChange]);

  const handleShuffle = () => {
    const nextIndex = (currentIndex + 1) % sentences.length;
    setCurrentIndex(nextIndex);
    onSentenceChange?.(sentences[nextIndex]);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="text-4xl sm:text-5xl font-bold mb-4">{new Date().getFullYear()}</div>
          <p className="text-xl sm:text-2xl text-white font-medium leading-relaxed min-h-[3rem]">
            {currentSentence}
          </p>
        </div>
        {/* Classification badge - smaller, secondary */}
        <div className={`inline-block px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 ${
          classification === 'normal'
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            : classification === 'lognormal'
            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
        }`}>
          {classification === 'lognormal' ? 'Log Normal' : classification === 'powerlaw' ? 'Power Law' : 'Normal'}
        </div>
      </div>
      {!readOnly && sentences.length > 1 && (
        <button
          type="button"
          onClick={handleShuffle}
          className="text-xs text-white/60 hover:text-white/80 transition-colors"
        >
          Shuffle ({currentIndex + 1} of {sentences.length})
        </button>
      )}
    </div>
  );
}

