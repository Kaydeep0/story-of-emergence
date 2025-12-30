'use client';

/**
 * Lifetime Timeline - Narrative view of reflections across years
 * 
 * Read-only view that shows how thinking evolves across years.
 * Minimal, reflective, meaning-first (not metrics-first).
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../../lib/reflectionLinks';
import type { ReflectionEntry } from '../../../lib/insights/types';

interface YearSummary {
  year: number;
  reflectionCount: number;
  summary: string;
}

/**
 * Group reflections by year
 */
function groupByYear(reflections: ReflectionEntry[]): Map<number, ReflectionEntry[]> {
  const grouped = new Map<number, ReflectionEntry[]>();
  
  for (const reflection of reflections) {
    const date = new Date(reflection.createdAt);
    const year = date.getFullYear();
    
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(reflection);
  }
  
  // Sort entries within each year by date (oldest first)
  for (const [year, entries] of grouped.entries()) {
    entries.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  
  return grouped;
}

/**
 * Generate a short narrative summary for a year's reflections
 */
function generateYearSummary(
  year: number,
  reflections: ReflectionEntry[]
): string {
  if (reflections.length === 0) {
    return '';
  }

  // Extract key themes from reflections
  const wordFreq = new Map<string, number>();
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
    'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our',
    'their', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'now', 'then', 'here', 'there',
  ]);

  // Count word frequencies (simple tokenization)
  for (const reflection of reflections) {
    const text = reflection.plaintext || '';
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
    
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // Get top themes (words that appear in multiple reflections)
  const themes = Array.from(wordFreq.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // Build narrative summary
  const parts: string[] = [];
  
  // Opening: reflection count
  const reflectionWord = reflections.length === 1 ? 'reflection' : 'reflections';
  parts.push(`${reflections.length} ${reflectionWord}`);

  // Add themes if available
  if (themes.length > 0) {
    const themePhrase = themes.slice(0, 3).join(', ');
    parts.push(`centered around ${themePhrase}`);
  }

  // Add a sense of time/evolution
  if (reflections.length >= 10) {
    parts.push('marking a year of growth and change');
  } else if (reflections.length >= 5) {
    parts.push('capturing moments of reflection');
  }

  return parts.join(' · ') + '.';
}

export default function LifetimeTimelinePage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load reflections
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    if (!encryptionReady || !sessionKey) {
      if (encryptionError) {
        setError(encryptionError);
      }
      return;
    }

    let cancelled = false;

    async function loadReflections() {
      if (!address || !sessionKey) {
        setReflections([]);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 1000,
          offset: 0,
        });

        if (cancelled) return;

        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, getSourceIdFor))
        );

        setReflections(reflectionEntries);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load reflections', err);
          setError(err.message ?? 'Failed to load reflections');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReflections();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address, encryptionReady, sessionKey, getSourceIdFor, encryptionError]);

  // Group by year and generate summaries
  const yearSummaries = useMemo(() => {
    if (reflections.length === 0) {
      return [];
    }

    const grouped = groupByYear(reflections);
    const summaries: YearSummary[] = [];

    // Sort years chronologically (oldest first)
    const years = Array.from(grouped.keys()).sort((a, b) => a - b);

    // Limit initial render to first + last year (lazy load middle later)
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const yearsToShow = firstYear === lastYear 
      ? [firstYear]
      : [firstYear, lastYear];

    for (const year of yearsToShow) {
      const yearReflections = grouped.get(year) || [];
      const summary = generateYearSummary(year, yearReflections);
      
      summaries.push({
        year,
        reflectionCount: yearReflections.length,
        summary,
      });
    }

    return summaries;
  }, [reflections]);

  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Lifetime Timeline</h1>
          <p className="text-white/60">Please connect your wallet to view your timeline.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-light mb-8">Lifetime Timeline</h1>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Lifetime Timeline</h1>
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (reflections.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Lifetime Timeline</h1>
          <p className="text-white/60">
            No reflections yet. Start writing to see your timeline unfold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-light mb-8">Lifetime Timeline</h1>
        
        <div className="space-y-12">
          {yearSummaries.map((yearSummary, index) => (
            <div key={yearSummary.year} className="space-y-2">
              {/* Year label */}
              <h2 className="text-xl font-light text-white/80">
                {yearSummary.year}
              </h2>
              
              {/* Summary text */}
              <p className="text-white/60 leading-relaxed text-sm">
                {yearSummary.summary}
              </p>
              
              {/* Reflection count (subtle) */}
              <p className="text-white/40 text-xs mt-2">
                {yearSummary.reflectionCount} {yearSummary.reflectionCount === 1 ? 'reflection' : 'reflections'}
              </p>
              
              {/* Divider (except for last item) */}
              {index < yearSummaries.length - 1 && (
                <div className="pt-8 border-t border-white/5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

