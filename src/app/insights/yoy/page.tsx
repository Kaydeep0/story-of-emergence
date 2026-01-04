// src/app/insights/yoy/page.tsx
// Year-over-Year lens - Compare two moments in time
// Task E: Wire Year over Year into the real Insights navigation

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import type { ReflectionEntry } from '../../lib/insights/types';
import type { YearOverYearCard } from '../../lib/insights/types';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import { InsightCardSkeleton } from '../components/InsightsSkeleton';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { InsightDrawer, normalizeInsight } from '../components/InsightDrawer';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import YearSelector from '../components/YearSelector';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';

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

export default function YearOverYearPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year1, setYear1] = useState<number | null>(null);
  const [year2, setYear2] = useState<number | null>(null);
  const [yoyCard, setYoyCard] = useState<YearOverYearCard | null>(null);
  const [insightArtifact, setInsightArtifact] = useState<InsightArtifact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [computeError, setComputeError] = useState<{ message: string; debug?: any } | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [retryKey, setRetryKey] = useState(0); // Force recompute on retry

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load reflections
  useEffect(() => {
    if (!mounted || !isConnected || !address || !encryptionReady || !sessionKey) {
      setReflections([]);
      return;
    }

    let cancelled = false;

    async function loadReflections() {
      if (!address || !sessionKey) return;
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
          console.error('Failed to load reflections:', err);
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
  }, [mounted, isConnected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Get available years
  const availableYears = useMemo(() => {
    const grouped = groupByYear(reflections);
    return Array.from(grouped.keys()).sort((a, b) => b - a);
  }, [reflections]);

  // Set default years (most recent two)
  useEffect(() => {
    if (availableYears.length >= 2 && year1 === null && year2 === null) {
      setYear1(availableYears[0]);
      setYear2(availableYears[1]);
    } else if (availableYears.length >= 1 && year1 === null) {
      setYear1(availableYears[0]);
    }
  }, [availableYears, year1, year2]);

  // Compute year-over-year card via canonical engine with proper state machine
  useEffect(() => {
    // Early return if prerequisites not met
    if (reflections.length === 0 || year1 === null || year2 === null || !address) {
      setYoyCard(null);
      setComputeError(null);
      setIsComputing(false);
      setInsightArtifact(null);
      return;
    }

    // Reset state - set loading BEFORE compute
    setComputeError(null);
    setIsComputing(true);
    setYoyCard(null);

    // Create timeout for 8 seconds
    const timeoutId = setTimeout(() => {
      setIsComputing(false);
      setComputeError({
        message: 'Computation timed out after 8 seconds',
        debug: {
          reflectionsCount: reflections.length,
          year1,
          year2,
          eventCount: reflections.length,
        },
      });
      setYoyCard(null);
    }, 8000);

    // Wrap compute in async function to handle timeout
    const computeAsync = async () => {
      try {
        // Dev log: Start compute
        if (process.env.NODE_ENV === 'development') {
          console.log('[YoY] start compute with yearA, yearB, reflectionsCount, eventsCount:', {
            yearA: year1,
            yearB: year2,
            reflectionsCount: reflections.length,
            eventsCount: reflections.length,
          });
        }

        // Convert reflections to UnifiedInternalEvent format (same pattern as other lenses)
        const walletAlias = address.toLowerCase();
        const events = reflections.map((r) => ({
          id: r.id ?? crypto.randomUUID(),
          walletAlias,
          eventAt: new Date(r.createdAt).toISOString(),
          eventKind: 'written' as const,
          sourceKind: 'journal' as const,
          plaintext: r.plaintext ?? '',
          length: (r.plaintext ?? '').length,
          sourceId: r.sourceId ?? null,
          topics: [],
        }));

        // Determine window: use all available reflections (YoY spans all time)
        const dates = reflections.map((r) => new Date(r.createdAt));
        const windowEnd = dates.length > 0 
          ? new Date(Math.max(...dates.map(d => d.getTime())))
          : new Date();
        const windowStart = dates.length > 0
          ? new Date(Math.min(...dates.map(d => d.getTime())))
          : new Date(windowEnd.getTime() - 10 * 365 * 24 * 60 * 60 * 1000); // Default to 10 years back

        // Compute YoY artifact via canonical engine with selected years
        // Pass reflections as fallback in case eventsToReflectionEntries fails
        const artifact = computeInsightsForWindow({
          horizon: 'yoy',
          events,
          windowStart,
          windowEnd,
          wallet: address ?? undefined,
          entriesCount: reflections.length,
          eventsCount: events.length,
          fromYear: year1,
          toYear: year2,
          reflectionsLoaded: reflections.length,
          eventsGenerated: events.length,
          reflections: reflections.map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            plaintext: r.plaintext ?? '',
          })),
        } as any);

        // Dev log: Artifact created
        if (process.env.NODE_ENV === 'development') {
          console.log('[YoY] artifact created with cardsLength and cardKinds:', {
            cardsLength: artifact.cards?.length ?? 0,
            cardKinds: artifact.cards?.map(c => c.kind) ?? [],
          });
        }

        // Clear timeout if computation completes
        clearTimeout(timeoutId);
        setIsComputing(false);

        // Store artifact for debug panel IMMEDIATELY
        setInsightArtifact(artifact);

        // Dev log: State set
        if (process.env.NODE_ENV === 'development') {
          console.log('[YoY] state set after setArtifact');
        }

        // Extract YearOverYearCard from artifact card metadata
        const cards = artifact.cards ?? [];
        const yoyCardData = cards.find((c) => c.kind === 'year_over_year');
        
        // Always extract card if it exists (even if one year is empty)
        if (yoyCardData && (yoyCardData as any)._yoyCard) {
          const card = (yoyCardData as any)._yoyCard as YearOverYearCard;
          setYoyCard(card);
          setComputeError(null);
        } else {
          // No card generated - this should not happen with new resilient builder
          // But handle gracefully
          setYoyCard(null);
          if (process.env.NODE_ENV === 'development') {
            console.warn('[YoY] No card found in artifact:', {
              cardsLength: cards.length,
              cardKinds: cards.map(c => c.kind),
            });
          }
        }
      } catch (err) {
        // Clear timeout on error
        clearTimeout(timeoutId);
        setIsComputing(false);
        
        console.error('Failed to compute year-over-year insights:', err);
        setComputeError({
          message: err instanceof Error ? err.message : 'Unknown error during computation',
          debug: {
            reflectionsCount: reflections.length,
            year1,
            year2,
            error: String(err),
          },
        });
        setYoyCard(null);
      }
    };

    computeAsync();

    // Cleanup function to clear timeout if component unmounts or dependencies change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [reflections, year1, year2, address, retryKey]);

  if (!mounted) return null;

  const lens = LENSES.yoy;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        <InsightDebugPanel debug={insightArtifact?.debug} />

        {loading && (
          <div className="space-y-4">
            <InsightCardSkeleton />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {!loading && !error && reflections.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">
              No reflections yet. Start writing reflections to see year-over-year comparisons.
            </p>
          </div>
        )}

        {!loading && !error && reflections.length > 0 && availableYears.length < 2 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">
              Need at least 2 years of reflections to compare. You currently have {availableYears.length} year{availableYears.length !== 1 ? 's' : ''} of data.
            </p>
          </div>
        )}

        {!loading && !error && reflections.length > 0 && availableYears.length >= 2 && (
          <div className="space-y-6">
            {/* Year Selectors */}
            <div className="flex items-center gap-4 justify-center">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/60">Year 1</label>
                <select
                  value={year1 ?? ''}
                  onChange={(e) => setYear1(Number(e.target.value))}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="pt-6 text-white/40">vs</div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/60">Year 2</label>
                <select
                  value={year2 ?? ''}
                  onChange={(e) => setYear2(Number(e.target.value))}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year-over-Year Card */}
            {yoyCard ? (
              <div className="space-y-4">
                <div
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    const normalized = normalizeInsight(yoyCard);
                    setSelectedInsight(normalized);
                    setDrawerOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-emerald-200">{yoyCard.title}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-white/70">{yoyCard.explanation}</p>

                  {yoyCard.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {yoyCard.evidence.slice(0, 4).map((ev, evIndex) => (
                        <span
                          key={String(ev.entryId) || `evidence-${evIndex}`}
                          className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded"
                        >
                          {new Date(ev.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      ))}
                      {yoyCard.evidence.length > 4 && (
                        <span className="text-xs text-white/40">
                          +{yoyCard.evidence.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Share Actions */}
                <ShareActionsBar
                  artifact={null}
                  senderWallet={address}
                  encryptionReady={encryptionReady}
                />
              </div>
            ) : computeError ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-rose-400 mb-2">Computation Error</h3>
                    <p className="text-sm text-white/70">{computeError.message}</p>
                  </div>
                  
                  {computeError.debug && (
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs font-mono">
                      <div className="text-white/50 mb-1">Debug Info:</div>
                      <div className="space-y-1 text-white/60">
                        {Object.entries(computeError.debug).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-white/50">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setComputeError(null);
                      setIsComputing(false);
                      setYoyCard(null);
                      // Force recompute by incrementing retry key
                      setRetryKey(prev => prev + 1);
                    }}
                    className="w-full rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (() => {
              // Dev log: Render gate
              if (process.env.NODE_ENV === 'development') {
                const cards = insightArtifact?.cards ?? [];
                const yoyCardData = cards.find((c) => c.kind === 'year_over_year');
                const hasYoYCard = !!(yoyCardData && (yoyCardData as any)._yoyCard);
                console.log('[YoY] render gate with hasYoYCard and loading and error:', {
                  hasYoYCard,
                  loading,
                  isComputing,
                  error: error ?? null,
                  computeError: computeError ? (computeError as { message: string }).message : null,
                  cardsLength: cards.length,
                });
              }

              // Show loading state
              if (isComputing) {
                return (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <p className="text-sm text-white/60">
                      Computing comparison between {year1} and {year2}...
                    </p>
                  </div>
                );
              }

              // Show error state
              if (computeError) {
                return null; // Error UI is handled above
              }

              // Show card if it exists
              if (yoyCard) {
                return null; // Card UI is handled above
              }

              // Show friendly message if no card (should not happen with resilient builder, but handle gracefully)
              const cards = insightArtifact?.cards ?? [];
              const yoyCardData = cards.find((c) => c.kind === 'year_over_year');
              if (!yoyCardData) {
                const year1Reflections = reflections.filter(r => {
                  const year = new Date(r.createdAt).getFullYear();
                  return year === year1;
                });
                const year2Reflections = reflections.filter(r => {
                  const year = new Date(r.createdAt).getFullYear();
                  return year === year2;
                });
                
                if (year1Reflections.length === 0 && year2Reflections.length === 0) {
                  return (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                      <p className="text-sm text-white/60">
                        No data available for {year1} or {year2}.
                      </p>
                    </div>
                  );
                } else if (year1Reflections.length === 0) {
                  return (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                      <p className="text-sm text-white/60">
                        No data available for {year1}. {year2} has {year2Reflections.length} reflection{year2Reflections.length !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  );
                } else if (year2Reflections.length === 0) {
                  return (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                      <p className="text-sm text-white/60">
                        No data available for {year2}. {year1} has {year1Reflections.length} reflection{year1Reflections.length !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  );
                }
              }

              // Fallback: should not reach here with resilient builder
              return (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-sm text-white/60">
                    Preparing comparison...
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Insight Detail Drawer */}
        <InsightDrawer
          insight={selectedInsight}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedInsight(null);
          }}
          originalCard={yoyCard ?? undefined}
          reflectionEntries={reflections}
        />
      </section>
    </div>
  );
}

