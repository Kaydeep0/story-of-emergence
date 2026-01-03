'use client';

/**
 * Long Arc Theme Evolution - View persistent themes across years
 * 
 * Read-only view that surfaces long-running themes to help users see
 * persistent patterns and shifts in identity.
 * Narrative-first, minimal, calm, reflective.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../../lib/reflectionLinks';
import type { ReflectionEntry } from '../../../lib/insights/types';

interface ThemeArc {
  theme: string;
  firstYear: number;
  lastYear: number;
  yearsPresent: number[];
  totalYears: number;
  narrative: string;
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
 * Extract themes from reflections for a given year
 */
function extractThemesForYear(reflections: ReflectionEntry[]): Set<string> {
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

  // Get themes (words that appear in multiple reflections)
  const themes = Array.from(wordFreq.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return new Set(themes);
}

/**
 * Build theme arcs across all years
 */
function buildThemeArcs(
  groupedByYear: Map<number, ReflectionEntry[]>
): ThemeArc[] {
  const themeTracker = new Map<string, {
    firstYear: number;
    lastYear: number;
    yearsPresent: Set<number>;
  }>();

  const years = Array.from(groupedByYear.keys()).sort((a, b) => a - b);

  // Track themes across all years
  for (const year of years) {
    const reflections = groupedByYear.get(year) || [];
    const themes = extractThemesForYear(reflections);

    for (const theme of themes) {
      if (!themeTracker.has(theme)) {
        themeTracker.set(theme, {
          firstYear: year,
          lastYear: year,
          yearsPresent: new Set([year]),
        });
      } else {
        const tracker = themeTracker.get(theme)!;
        tracker.firstYear = Math.min(tracker.firstYear, year);
        tracker.lastYear = Math.max(tracker.lastYear, year);
        tracker.yearsPresent.add(year);
      }
    }
  }

  // Convert to ThemeArc objects
  const arcs: ThemeArc[] = [];

  for (const [theme, tracker] of themeTracker.entries()) {
    const yearsPresent = Array.from(tracker.yearsPresent).sort((a, b) => a - b);
    const totalYears = tracker.lastYear - tracker.firstYear + 1;
    const yearsActive = tracker.yearsPresent.size;

    // Generate narrative description
    const narrative = generateThemeNarrative(
      theme,
      tracker.firstYear,
      tracker.lastYear,
      yearsActive,
      totalYears
    );

    arcs.push({
      theme,
      firstYear: tracker.firstYear,
      lastYear: tracker.lastYear,
      yearsPresent,
      totalYears,
      narrative,
    });
  }

  // Sort by persistence (themes that span more years first)
  arcs.sort((a, b) => {
    // First sort by total years span
    const spanDiff = (b.lastYear - b.firstYear) - (a.lastYear - a.firstYear);
    if (spanDiff !== 0) return spanDiff;
    
    // Then by number of years active
    const activeDiff = b.yearsPresent.length - a.yearsPresent.length;
    if (activeDiff !== 0) return activeDiff;
    
    // Finally by first year (older themes first)
    return a.firstYear - b.firstYear;
  });

  return arcs;
}

/**
 * Generate narrative description for a theme arc
 */
function generateThemeNarrative(
  theme: string,
  firstYear: number,
  lastYear: number,
  yearsActive: number,
  totalYears: number
): string {
  const span = lastYear - firstYear + 1;
  const continuity = yearsActive / totalYears;

  // Determine narrative based on continuity and span
  if (continuity >= 0.8 && span >= 3) {
    return `This theme appears consistently across ${span} years, marking a persistent thread in your reflections.`;
  } else if (continuity >= 0.6 && span >= 2) {
    return `This theme emerges in ${firstYear} and continues through ${lastYear}, appearing in ${yearsActive} of ${totalYears} years.`;
  } else if (span >= 3) {
    return `This theme spans ${span} years, appearing intermittently from ${firstYear} to ${lastYear}.`;
  } else if (yearsActive === totalYears && span === 2) {
    return `This theme appears consistently during ${firstYear}–${lastYear}.`;
  } else {
    return `This theme appears in ${yearsActive} year${yearsActive === 1 ? '' : 's'} between ${firstYear} and ${lastYear}.`;
  }
}

export default function ArcPage() {
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

  // Group by year and build theme arcs
  const themeArcs = useMemo(() => {
    if (reflections.length === 0) {
      return [];
    }

    const grouped = groupByYear(reflections);
    
    // Only build arcs if we have at least 2 years of data
    if (grouped.size < 2) {
      return [];
    }

    return buildThemeArcs(grouped);
  }, [reflections]);

  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Long Arc Theme Evolution</h1>
          <p className="text-white/60">Please connect your wallet to view your theme arcs.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-light mb-8">Long Arc Theme Evolution</h1>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 pb-6 border-b border-white/5">
                <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Long Arc Theme Evolution</h1>
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (reflections.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Long Arc Theme Evolution</h1>
          <p className="text-white/60">
            No reflections yet. Start writing to see your theme arcs unfold.
          </p>
        </div>
      </div>
    );
  }

  if (themeArcs.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Long Arc Theme Evolution</h1>
          <p className="text-white/60">
            Not enough data to identify theme arcs. You need reflections from at least two years.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-light mb-8">Long Arc Theme Evolution</h1>
        
        <div className="space-y-8">
          {themeArcs.map((arc, index) => (
            <div key={arc.theme} className="pb-8 border-b border-white/5 last:border-0">
              {/* Theme name */}
              <h2 className="text-lg font-light text-white/90 mb-2 capitalize">
                {arc.theme}
              </h2>
              
              {/* Active year range */}
              <p className="text-sm text-white/50 mb-3">
                {arc.firstYear === arc.lastYear 
                  ? arc.firstYear
                  : `${arc.firstYear}–${arc.lastYear}`}
              </p>
              
              {/* Narrative description */}
              <p className="text-white/60 leading-relaxed text-sm">
                {arc.narrative}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

