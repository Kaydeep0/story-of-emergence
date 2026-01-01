'use client';

/**
 * Year-over-Year Comparison - Read-only view using insight engine
 * 
 * Shows contrast and observation between two years.
 * Narrative-first, contrast-focused, no rankings or scoring.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import type { ReflectionEntry } from '../../lib/insights/types';
import { generateYearlyArtifact } from '../../../lib/artifacts/yearlyArtifact';
import { generateYearOverYearNarrative } from '../../../lib/narratives/yearOverYearNarrative';
import type { YearOverYearNarrative } from '../../../lib/narratives/yearOverYearNarrative';
import { computeDistributionLayer } from '../../lib/insights/distributionLayer';

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
  
  return grouped;
}

/**
 * Generate narrative summary for a year
 */
function generateYearSummary(year: number, reflections: ReflectionEntry[]): string {
  if (reflections.length === 0) {
    return '';
  }

  const reflectionWord = reflections.length === 1 ? 'reflection' : 'reflections';
  const parts: string[] = [`${reflections.length} ${reflectionWord}`];

  if (reflections.length >= 10) {
    parts.push('marking a year of reflection');
  } else if (reflections.length >= 5) {
    parts.push('capturing moments of thought');
  }

  return parts.join(' · ') + '.';
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
  const [year1Artifact, setYear1Artifact] = useState<import('../../../lib/lifetimeArtifact').ShareArtifact | null>(null);
  const [year2Artifact, setYear2Artifact] = useState<import('../../../lib/lifetimeArtifact').ShareArtifact | null>(null);
  const [narrative, setNarrative] = useState<YearOverYearNarrative | null>(null);

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

  // Generate yearly artifacts for selected years
  useEffect(() => {
    if (!selectedYear1 || !address || reflections.length === 0) {
      setYear1Artifact(null);
      return;
    }

    const year1Reflections = groupedByYear.get(selectedYear1) || [];
    if (year1Reflections.length === 0) {
      setYear1Artifact(null);
      return;
    }

    const distributionResult = computeDistributionLayer(year1Reflections, { windowDays: 365 });
    generateYearlyArtifact(year1Reflections, distributionResult, address)
      .then(setYear1Artifact)
      .catch((err) => {
        console.error('Failed to generate year 1 artifact', err);
        setYear1Artifact(null);
      });
  }, [selectedYear1, reflections, groupedByYear, address]);

  useEffect(() => {
    if (!selectedYear2 || !address || reflections.length === 0) {
      setYear2Artifact(null);
      return;
    }

    const year2Reflections = groupedByYear.get(selectedYear2) || [];
    if (year2Reflections.length === 0) {
      setYear2Artifact(null);
      return;
    }

    const distributionResult = computeDistributionLayer(year2Reflections, { windowDays: 365 });
    generateYearlyArtifact(year2Reflections, distributionResult, address)
      .then(setYear2Artifact)
      .catch((err) => {
        console.error('Failed to generate year 2 artifact', err);
        setYear2Artifact(null);
      });
  }, [selectedYear2, reflections, groupedByYear, address]);

  // Generate narrative from artifacts
  useEffect(() => {
    if (!year1Artifact || !year2Artifact) {
      setNarrative(null);
      return;
    }

    try {
      const narrativeDelta = generateYearOverYearNarrative(year1Artifact, year2Artifact);
      setNarrative(narrativeDelta);
    } catch (err) {
      console.error('Failed to generate narrative', err);
      setNarrative(null);
    }
  }, [year1Artifact, year2Artifact]);


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

  if (availableYears.length < 2) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-light mb-4">Year-over-Year Comparison</h1>
          <p className="text-white/60">
            Year over Year requires reflections from at least two years. You currently have data from {availableYears.length} year{availableYears.length === 1 ? '' : 's'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
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

          {/* Narrative card */}
          {selectedYear1 && selectedYear2 && narrative ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
              <div>
                <h2 className="text-xl font-light text-white/90 mb-2">
                  {narrative.headline}
                </h2>
                <p className="text-white/70 leading-relaxed">
                  {narrative.dominantShift}
                </p>
              </div>

              {narrative.themesIntroduced.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-white/60 mb-3">Themes introduced</p>
                  <div className="flex flex-wrap gap-2">
                    {narrative.themesIntroduced.map((theme, idx) => (
                      <span
                        key={idx}
                        className="text-xs text-emerald-400/70 px-2 py-1 rounded bg-emerald-500/10"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {narrative.themesFaded.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-white/60 mb-3">Themes faded</p>
                  <div className="flex flex-wrap gap-2">
                    {narrative.themesFaded.map((theme, idx) => (
                      <span
                        key={idx}
                        className="text-xs text-white/40 px-2 py-1 rounded bg-white/5 line-through"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/40">
                  Intensity: {narrative.intensityChange === 'up' ? 'increased' : narrative.intensityChange === 'down' ? 'decreased' : 'remained consistent'}
                </p>
              </div>
            </div>
          ) : selectedYear1 && selectedYear2 ? (
            <div className="text-white/60">
              <p>Generating narrative...</p>
            </div>
          ) : (
            <div className="text-white/60">
              <p>Select two years above to begin comparison.</p>
            </div>
          )}
        </div>
      </div>

    </>
  );
}
