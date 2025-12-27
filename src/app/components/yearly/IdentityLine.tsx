'use client';

import React, { useState, useEffect } from 'react';

interface IdentityLineProps {
  totalEntries: number;
  activeDays: number;
  spikeRatio: number;
  top10PercentShare: number;
  classification: 'normal' | 'lognormal' | 'powerlaw';
  onSentenceChange?: (sentence: string) => void;
}

export function IdentityLine({
  totalEntries,
  activeDays,
  spikeRatio,
  top10PercentShare,
  classification,
  onSentenceChange,
}: IdentityLineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Generate 3 alternative sentences
  const sentences = [
    // Sentence 1: Focus on rhythm pattern
    classification === 'lognormal'
      ? spikeRatio >= 4
        ? 'You moved in quiet stretches, then showed up in powerful bursts when it mattered.'
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
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-3">Your year, in one sentence</h3>
      <p className="text-lg text-white/90 mb-4 leading-relaxed min-h-[3rem]">
        {currentSentence}
      </p>
      {sentences.length > 1 && (
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

