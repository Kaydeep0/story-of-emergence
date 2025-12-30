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
import { computeAllInsights } from '../../lib/insights/computeAllInsights';
import type { ReflectionEntry } from '../../lib/insights/types';

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
  const [selectedReflection, setSelectedReflection] = useState<ReflectionEntry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  // Compute year-over-year insights
  const yearOverYearInsight = useMemo(() => {
    if (!selectedYear1 || !selectedYear2 || reflections.length === 0) {
      return null;
    }

    const result = computeAllInsights(reflections, {
      fromYear: selectedYear1,
      toYear: selectedYear2,
    });

    return result.yearOverYear;
  }, [reflections, selectedYear1, selectedYear2]);

  // Get year data for display
  const year1Data = useMemo(() => {
    if (!selectedYear1) return null;
    const yearReflections = groupedByYear.get(selectedYear1) || [];
    return {
      year: selectedYear1,
      reflections: yearReflections,
      summary: generateYearSummary(selectedYear1, yearReflections),
      themes: yearOverYearInsight?.data.themeContinuities
        .filter(t => t.presentInYear1)
        .map(t => t.theme)
        .slice(0, 5) || [],
    };
  }, [selectedYear1, groupedByYear, yearOverYearInsight]);

  const year2Data = useMemo(() => {
    if (!selectedYear2) return null;
    const yearReflections = groupedByYear.get(selectedYear2) || [];
    return {
      year: selectedYear2,
      reflections: yearReflections,
      summary: generateYearSummary(selectedYear2, yearReflections),
      themes: yearOverYearInsight?.data.themeContinuities
        .filter(t => t.presentInYear2)
        .map(t => t.theme)
        .slice(0, 5) || [],
    };
  }, [selectedYear2, groupedByYear, yearOverYearInsight]);

  // Handle evidence click
  const handleEvidenceClick = (entryId: string) => {
    const reflection = reflections.find(r => r.id === entryId);
    if (reflection) {
      setSelectedReflection(reflection);
      setPreviewOpen(true);
    }
  };

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

          {/* Comparison content */}
          {selectedYear1 && selectedYear2 && yearOverYearInsight ? (
            <div className="space-y-8">
              {/* Year summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {year1Data && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-light text-white/80">
                      {year1Data.year}
                    </h2>
                    <p className="text-white/60 leading-relaxed text-sm">
                      {year1Data.summary}
                    </p>
                    {year1Data.themes.length > 0 && (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-white/40 mb-2">Themes</p>
                        <div className="flex flex-wrap gap-2">
                          {year1Data.themes.map((theme) => (
                            <span
                              key={theme}
                              className="text-xs text-white/50 px-2 py-1 rounded bg-white/5 capitalize"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {year2Data && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-light text-white/80">
                      {year2Data.year}
                    </h2>
                    <p className="text-white/60 leading-relaxed text-sm">
                      {year2Data.summary}
                    </p>
                    {year2Data.themes.length > 0 && (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-white/40 mb-2">Themes</p>
                        <div className="flex flex-wrap gap-2">
                          {year2Data.themes.map((theme) => (
                            <span
                              key={theme}
                              className="text-xs text-white/50 px-2 py-1 rounded bg-white/5 capitalize"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contrast section */}
              <div className="pt-8 border-t border-white/10 space-y-6">
                <h3 className="text-lg font-light text-white/80">Contrast</h3>
                
                {/* Continuities */}
                {yearOverYearInsight.data.themeContinuities.length > 0 && (
                  <div>
                    <p className="text-sm text-white/60 mb-3">Continued themes</p>
                    <div className="flex flex-wrap gap-2">
                      {yearOverYearInsight.data.themeContinuities.map((continuity) => (
                        <span
                          key={continuity.theme}
                          className="text-xs text-white/50 px-2 py-1 rounded bg-white/5 capitalize"
                        >
                          {continuity.theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergences */}
                {yearOverYearInsight.data.themeEmergences.length > 0 && (
                  <div>
                    <p className="text-sm text-white/60 mb-3">New themes</p>
                    <div className="flex flex-wrap gap-2">
                      {yearOverYearInsight.data.themeEmergences.map((emergence) => (
                        <span
                          key={emergence.theme}
                          className="text-xs text-emerald-400/70 px-2 py-1 rounded bg-emerald-500/10 capitalize"
                        >
                          {emergence.theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disappearances */}
                {yearOverYearInsight.data.themeDisappearances.length > 0 && (
                  <div>
                    <p className="text-sm text-white/60 mb-3">Faded themes</p>
                    <div className="flex flex-wrap gap-2">
                      {yearOverYearInsight.data.themeDisappearances.map((disappearance) => (
                        <span
                          key={disappearance.theme}
                          className="text-xs text-white/40 px-2 py-1 rounded bg-white/5 capitalize line-through"
                        >
                          {disappearance.theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Language shifts */}
                {yearOverYearInsight.data.languageShifts.length > 0 && (
                  <div>
                    <p className="text-sm text-white/60 mb-3">Language shifts</p>
                    <div className="space-y-2">
                      {yearOverYearInsight.data.languageShifts.map((shift, idx) => (
                        <p key={idx} className="text-sm text-white/60 italic">
                          {shift.descriptor}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notable absences */}
                {yearOverYearInsight.data.notableAbsences.length > 0 && (
                  <div>
                    <p className="text-sm text-white/60 mb-3">Notable absences</p>
                    <div className="space-y-2">
                      {yearOverYearInsight.data.notableAbsences.map((absence, idx) => (
                        <p key={idx} className="text-sm text-white/60">
                          {absence.what} was present in {absence.previouslySeenIn} but absent in {absence.nowAbsentIn}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence */}
              {yearOverYearInsight.evidence.length > 0 && (
                <div className="pt-8 border-t border-white/10">
                  <p className="text-sm text-white/60 mb-3">Evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {yearOverYearInsight.evidence.map((ev) => (
                      <button
                        key={ev.entryId}
                        onClick={() => handleEvidenceClick(ev.entryId)}
                        className="text-xs text-white/60 hover:text-white/80 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        title={ev.preview}
                      >
                        {ev.preview?.slice(0, 30) || 'View reflection'}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : selectedYear1 && selectedYear2 ? (
            <div className="text-white/60">
              <p>Computing comparison...</p>
            </div>
          ) : (
            <div className="text-white/60">
              <p>Select two years above to begin comparison.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reflection preview drawer */}
      {selectedReflection && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[60] transition-opacity duration-[220ms] ease-out ${
            previewOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => {
            setPreviewOpen(false);
            setSelectedReflection(null);
          }}
          aria-hidden={!previewOpen}
        />
      )}
      {selectedReflection && previewOpen && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-black border-l border-white/10 z-[70] flex-col shadow-2xl hidden sm:flex">
          <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-white/10 p-6 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">Reflection</h3>
              <p className="text-xs text-white/60 mt-1">
                {new Date(selectedReflection.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={() => {
                setPreviewOpen(false);
                setSelectedReflection(null);
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {selectedReflection.plaintext}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
