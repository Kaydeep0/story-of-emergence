'use client';

import { extractKeywords } from '../../insights/yearly/components/YearlyMeaning';
import type { ReflectionEntry } from '../../lib/insights/types';

interface GrowthStoryProps {
  entries: ReflectionEntry[];
}

export function GrowthStory({ entries }: GrowthStoryProps) {
  if (entries.length < 10) {
    return null; // Not enough data
  }

  const currentYear = new Date().getFullYear();
  const midYear = new Date(currentYear, 6, 1);
  
  const earlyHalf = entries.filter(e => new Date(e.createdAt) < midYear);
  const lateHalf = entries.filter(e => new Date(e.createdAt) >= midYear);

  if (earlyHalf.length === 0 || lateHalf.length === 0) {
    return null;
  }

  const earlyKeywords = extractKeywords(earlyHalf, 5);
  const lateKeywords = extractKeywords(lateHalf, 5);

  // Find shift words
  const earlyWordCounts = new Map<string, number>();
  const lateWordCounts = new Map<string, number>();

  earlyHalf.forEach(entry => {
    if (!entry.plaintext) return;
    const words = entry.plaintext.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    words.forEach(word => {
      earlyWordCounts.set(word, (earlyWordCounts.get(word) || 0) + 1);
    });
  });

  lateHalf.forEach(entry => {
    if (!entry.plaintext) return;
    const words = entry.plaintext.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    words.forEach(word => {
      lateWordCounts.set(word, (lateWordCounts.get(word) || 0) + 1);
    });
  });

  const earlyTotal = earlyHalf.length || 1;
  const lateTotal = lateHalf.length || 1;

  const shifts = new Map<string, number>();
  const allWords = new Set([...earlyWordCounts.keys(), ...lateWordCounts.keys()]);

  allWords.forEach(word => {
    const earlyRate = (earlyWordCounts.get(word) || 0) / earlyTotal;
    const lateRate = (lateWordCounts.get(word) || 0) / lateTotal;
    shifts.set(word, lateRate - earlyRate);
  });

  const rising = Array.from(shifts.entries())
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  const fading = Array.from(shifts.entries())
    .filter(([, score]) => score < 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([word]) => word);

  // Generate narrative
  let narrative = '';
  if (fading.length > 0 && rising.length > 0) {
    narrative = `Early you circled around ${fading[0]}. Later you leaned into ${rising[0]}.`;
  } else if (rising.length > 0) {
    narrative = `Later you leaned into ${rising[0]}${rising.length > 1 ? ` and ${rising[1]}` : ''}.`;
  } else {
    narrative = 'Your themes remained consistent throughout the year.';
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold mb-4">How you changed this year</h3>
      
      <div className="grid gap-6 lg:grid-cols-2 mb-4">
        <div>
          <h4 className="text-sm font-medium text-white/80 mb-2">Earlier</h4>
          <div className="flex flex-wrap gap-2">
            {earlyKeywords.slice(0, 5).map((word) => (
              <span
                key={word}
                className="px-2 py-1 rounded-lg bg-white/10 text-white/70 text-xs"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-white/80 mb-2">Later</h4>
          <div className="flex flex-wrap gap-2">
            {lateKeywords.slice(0, 5).map((word) => (
              <span
                key={word}
                className="px-2 py-1 rounded-lg bg-white/10 text-white/70 text-xs"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <p className="text-sm text-white/80 text-center mb-2">{narrative}</p>
      <p className="text-xs text-white/50 text-center">Only you can see this. Not included in share exports.</p>
    </div>
  );
}

