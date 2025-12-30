'use client';

/**
 * Year-over-Year Comparison - Narrative view comparing adjacent years
 * 
 * Read-only view that shows how themes, tone, and focus evolve over time.
 * Narrative-first, calm, thoughtful.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../../lib/reflectionLinks';
import type { ReflectionEntry } from '../../../lib/insights/types';

interface YearData {
  year: number;
  reflections: ReflectionEntry[];
  summary: string;
  dominantThemes: string[];
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
 * Extract dominant themes from reflections
 */
function extractDominantThemes(reflections: ReflectionEntry[], maxThemes = 5): string[] {
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
  return Array.from(wordFreq.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxThemes)
    .map(([word]) => word);
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

  const themes = extractDominantThemes(reflections, 5);

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

/**
 * Process year data for comparison
 */
function processYearData(
  year: number,
  reflections: ReflectionEntry[]
): YearData {
  const summary = generateYearSummary(year, reflections);
  const dominantThemes = extractDominantThemes(reflections, 5);

  return {
    year,
    reflections,
    summary,
    dominantThemes,
  };
}

export default function ComparePage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [selectedYear1, setSelectedYear1] = useState<number | null>(null);
  const [selectedYear2, setSelectedYear2] = useState<number | null>(null);

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

  // Group by year and set default selections
  const { groupedByYear, availableYears } = useMemo(() => {
    if (reflections.length === 0) {
      return { groupedByYear: new Map<number, ReflectionEntry[]>(), availableYears: [] };
    }

    const grouped = groupByYear(reflections);
    const years = Array.from(grouped.keys()).sort((a, b) => b - a); // Newest first

    return { groupedByYear: grouped, availableYears: years };
  }, [reflections]);

  // Set default years (most recent two)
  useEffect(() => {
    if (availableYears.length >= 2 && selectedYear1 === null && selectedYear2 === null) {
      setSelectedYear1(availableYears[0]);
      setSelectedYear2(availableYears[1]);
    } else if (availableYears.length === 1 && selectedYear1 === null) {
      setSelectedYear1(availableYears[0]);
      setSelectedYear2(null);
    }
  }, [availableYears, selectedYear1, selectedYear2]);

  // Process selected years
  const year1Data = useMemo(() => {
    if (!selectedYear1) return null;
    const yearReflections = groupedByYear.get(selectedYear1) || [];
    return processYearData(selectedYear1, yearReflections);
  }, [selectedYear1, groupedByYear]);

  const year2Data = useMemo(() => {
    if (!selectedYear2) return null;
    const yearReflections = groupedByYear.get(selectedYear2) || [];
    return processYearData(selectedYear2, yearReflections);
  }, [selectedYear2, groupedByYear]);

  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Year-over-Year Comparison</h1>
          <p className="text-white/60">Please connect your wallet to view your comparison.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-light mb-8">Year-over-Year Comparison</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Year-over-Year Comparison</h1>
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (reflections.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Year-over-Year Comparison</h1>
          <p className="text-white/60">
            No reflections yet. Start writing to see your comparison.
          </p>
        </div>
      </div>
    );
  }

  if (availableYears.length < 1) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Year-over-Year Comparison</h1>
          <p className="text-white/60">
            Not enough data to compare. You need reflections from at least one year.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-light mb-8">Year-over-Year Comparison</h1>
        
        {/* Year selectors */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60">First year:</label>
            <select
              value={selectedYear1 || ''}
              onChange={(e) => setSelectedYear1(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
            >
              <option value="">Select year</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60">Second year:</label>
            <select
              value={selectedYear2 || ''}
              onChange={(e) => setSelectedYear2(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
            >
              <option value="">Select year</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Year 1 */}
          {year1Data && (
            <div className="space-y-4 transition-opacity duration-300">
              <h2 className="text-xl font-light text-white/80">
                {year1Data.year}
              </h2>
              
              <p className="text-white/60 leading-relaxed text-sm">
                {year1Data.summary}
              </p>
              
              {year1Data.dominantThemes.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-white/40 mb-2">Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {year1Data.dominantThemes.map((theme) => (
                      <span
                        key={theme}
                        className="text-xs text-white/50 px-2 py-1 rounded bg-white/5"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Year 2 */}
          {year2Data && (
            <div className="space-y-4 transition-opacity duration-300">
              <h2 className="text-xl font-light text-white/80">
                {year2Data.year}
              </h2>
              
              <p className="text-white/60 leading-relaxed text-sm">
                {year2Data.summary}
              </p>
              
              {year2Data.dominantThemes.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-white/40 mb-2">Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {year2Data.dominantThemes.map((theme) => (
                      <span
                        key={theme}
                        className="text-xs text-white/50 px-2 py-1 rounded bg-white/5"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state for single year */}
          {year1Data && !year2Data && (
            <div className="space-y-4 text-white/40">
              <p className="text-sm italic">Select a second year to compare.</p>
            </div>
          )}

          {/* Empty state for no selection */}
          {!year1Data && !year2Data && (
            <div className="col-span-2 space-y-4 text-white/40">
              <p className="text-sm italic">Select years above to begin comparison.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

