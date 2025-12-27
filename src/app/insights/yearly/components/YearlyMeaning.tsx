'use client';

import { useState } from 'react';
import type { ReflectionEntry } from '../../../lib/insights/types';

// Simple stopwords list
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'including', 'until', 'against', 'among',
  'throughout', 'despite', 'towards', 'upon', 'concerning', 'to', 'of', 'in', 'for', 'on', 'at',
  'by', 'with', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what',
  'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should',
  'now', 'get', 'got', 'go', 'went', 'come', 'came', 'see', 'saw', 'know', 'knew', 'think',
  'thought', 'take', 'took', 'make', 'made', 'give', 'gave', 'say', 'said', 'tell', 'told',
]);

// Extract keywords from entries
export function extractKeywords(entries: ReflectionEntry[], limit: number = 14): string[] {
  const wordCounts = new Map<string, number>();

  entries.forEach(entry => {
    if (!entry.plaintext) return;
    
    const words = entry.plaintext
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOPWORDS.has(word));

    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

// Compute word shift between first and second half of year
export function computeWordShift(entries: ReflectionEntry[]): {
  rising: Array<{ word: string; score: number }>;
  fading: Array<{ word: string; score: number }>;
} {
  const currentYear = new Date().getFullYear();
  const midYear = new Date(currentYear, 6, 1); // July 1st

  const firstHalf: ReflectionEntry[] = [];
  const secondHalf: ReflectionEntry[] = [];

  entries.forEach(entry => {
    const entryDate = new Date(entry.createdAt);
    if (entryDate < midYear) {
      firstHalf.push(entry);
    } else {
      secondHalf.push(entry);
    }
  });

  const firstHalfWords = extractWordFrequencies(firstHalf);
  const secondHalfWords = extractWordFrequencies(secondHalf);

  // Normalize by entry count
  const firstHalfTotal = firstHalf.length || 1;
  const secondHalfTotal = secondHalf.length || 1;

  const shifts = new Map<string, number>();

  // Calculate shift scores
  const allWords = new Set([...firstHalfWords.keys(), ...secondHalfWords.keys()]);
  allWords.forEach(word => {
    const firstRate = (firstHalfWords.get(word) || 0) / firstHalfTotal;
    const secondRate = (secondHalfWords.get(word) || 0) / secondHalfTotal;
    shifts.set(word, secondRate - firstRate);
  });

  const sorted = Array.from(shifts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word, score]) => ({ word, score }));

  return {
    rising: sorted.filter(s => s.score > 0).slice(0, 5),
    fading: sorted.filter(s => s.score < 0).reverse().slice(0, 5),
  };
}

function extractWordFrequencies(entries: ReflectionEntry[]): Map<string, number> {
  const wordCounts = new Map<string, number>();

  entries.forEach(entry => {
    if (!entry.plaintext) return;
    
    const words = entry.plaintext
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOPWORDS.has(word));

    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  return wordCounts;
}

// Get moments from top spike days
export function getMoments(entries: ReflectionEntry[], topDates: string[]): Array<{
  date: string;
  preview: string;
  entryId?: string;
}> {
  const moments: Array<{ date: string; preview: string; entryId?: string }> = [];

  topDates.slice(0, 3).forEach(date => {
    const dateStr = date; // YYYY-MM-DD format
    const dayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
      return entryDate === dateStr;
    });

    if (dayEntries.length > 0) {
      const firstEntry = dayEntries[0];
      const preview = firstEntry.plaintext
        ? firstEntry.plaintext.slice(0, 160).trim() + (firstEntry.plaintext.length > 160 ? '...' : '')
        : '';
      
      moments.push({
        date: dateStr,
        preview,
        entryId: firstEntry.id,
      });
    }
  });

  return moments;
}

// Meaning card component
export function MeaningCard({
  title,
  explanation,
  rhythmNote,
  metricChip,
}: {
  title: string;
  explanation: string;
  rhythmNote: string;
  metricChip: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 whitespace-nowrap">
          {metricChip}
        </span>
      </div>
      <p className="text-xs text-white/70 mb-2">{explanation}</p>
      <p className="text-xs text-white/50 italic">{rhythmNote}</p>
    </div>
  );
}

// Glossary component
export function Glossary() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4">
      <p className="text-xs text-white/60 mb-2">Numbers are just shadows. Here is what they mean in human terms.</p>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors"
      >
        <span>What do these terms mean?</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-3 space-y-3 text-xs text-white/70">
          <div>
            <div className="font-medium text-white/90 mb-1">Log normal</div>
            <div>Most days are small, a few days are huge. Steady baseline plus occasional surges.</div>
          </div>
          <div>
            <div className="font-medium text-white/90 mb-1">Variance</div>
            <div>How spread out your days are. Low variance means consistent daily volume. High variance means quiet stretches and then big bursts.</div>
          </div>
          <div>
            <div className="font-medium text-white/90 mb-1">Spike ratio</div>
            <div>Your biggest day divided by your typical day. A high spike ratio means you tend to pour it all out in a handful of intense sessions.</div>
          </div>
          <div>
            <div className="font-medium text-white/90 mb-1">Top 10 percent days share</div>
            <div>How much of your total writing happened on your busiest days. If this is high, your year was driven by a few "gravity well" days.</div>
          </div>
          <div>
            <div className="font-medium text-white/90 mb-1">Most common day count</div>
            <div>Your most typical daily output level. This is basically your baseline rhythm.</div>
          </div>
        </div>
      )}
    </div>
  );
}

