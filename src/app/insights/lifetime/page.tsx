'use client';

/**
 * Lifetime Insights v1
 * 
 * Shows lifetime distribution metrics across all reflections.
 * Uses the same distribution layer pipeline as Weekly, Distributions, and YoY.
 */

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry } from '../../lib/insights/timelineSpikes';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import { computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from '../../lib/insights/distributionLayer';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';
import type { ReflectionEntry } from '../../lib/insights/types';

export default function LifetimePage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [computeError, setComputeError] = useState<{ message: string; debug?: any } | null>(null);
  const [insightArtifact, setInsightArtifact] = useState<InsightArtifact | null>(null);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [windowDistribution, setWindowDistribution] = useState<WindowDistribution | null>(null);

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

        const reflectionEntries = items.map((item) => itemToReflectionEntry(item));
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
  }, [mounted, isConnected, address, encryptionReady, sessionKey]);

  // Compute lifetime artifact via canonical engine
  useEffect(() => {
    if (reflections.length === 0 || !address) {
      setDistributionResult(null);
      setWindowDistribution(null);
      setComputeError(null);
      setIsComputing(false);
      setInsightArtifact(null);
      return;
    }

    // Reset state
    setComputeError(null);
    setIsComputing(true);

    // Wrap compute in async function
    const computeAsync = async () => {
      try {
        // Dev log: Start compute
        if (process.env.NODE_ENV === 'development') {
          console.log('[Lifetime] start compute with reflectionsCount, eventsCount:', {
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

        // Determine window: use all available reflections (lifetime spans all time)
        const dates = reflections.map((r) => new Date(r.createdAt));
        const windowEnd = dates.length > 0 
          ? new Date(Math.max(...dates.map(d => d.getTime())))
          : new Date();
        const windowStart = dates.length > 0
          ? new Date(Math.min(...dates.map(d => d.getTime())))
          : new Date(windowEnd.getTime() - 10 * 365 * 24 * 60 * 60 * 1000); // Default to 10 years back

        // Compute lifetime artifact via canonical engine
        // Pass reflections as fallback in case eventsToReflectionEntries fails
        const artifact = computeInsightsForWindow({
          horizon: 'lifetime',
          events,
          windowStart,
          windowEnd,
          wallet: address ?? undefined,
          entriesCount: reflections.length,
          eventsCount: events.length,
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
          console.log('[Lifetime] artifact created with cardsLength and cardKinds:', {
            cardsLength: artifact.cards?.length ?? 0,
            cardKinds: artifact.cards?.map(c => c.kind) ?? [],
          });
        }

        setIsComputing(false);

        // Store artifact for debug panel
        setInsightArtifact(artifact);

        // Dev log: State set
        if (process.env.NODE_ENV === 'development') {
          console.log('[Lifetime] state set after setArtifact');
        }

        // Extract DistributionResult and WindowDistribution from artifact card metadata
        const cards = artifact.cards ?? [];
        const lifetimeCard = cards.find((c) => c.kind === 'distribution');
        
        if (lifetimeCard) {
          const cardWithMeta = lifetimeCard as any;
          if (cardWithMeta._distributionResult) {
            setDistributionResult(cardWithMeta._distributionResult);
          }
          if (cardWithMeta._windowDistribution) {
            setWindowDistribution(cardWithMeta._windowDistribution);
          }
        } else {
          setDistributionResult(null);
          setWindowDistribution(null);
        }
      } catch (err) {
        setIsComputing(false);
        console.error('Failed to compute lifetime insights:', err);
        setComputeError({
          message: err instanceof Error ? err.message : 'Unknown error during computation',
          debug: {
            reflectionsCount: reflections.length,
            error: String(err),
          },
        });
        setDistributionResult(null);
        setWindowDistribution(null);
      }
    };

    computeAsync();
  }, [reflections, address]);

  if (!mounted) return null;

  const lens = LENSES.lifetime;

  // Dev log: Render gate
  if (process.env.NODE_ENV === 'development') {
    const cards = insightArtifact?.cards ?? [];
    const lifetimeCard = cards.find((c) => c.kind === 'distribution');
    const hasLifetimeCard = !!lifetimeCard;
    console.log('[Lifetime] render gate with hasLifetimeCard and loading and error:', {
      hasLifetimeCard,
      loading,
      isComputing,
      error: error ?? null,
      computeError: computeError?.message ?? null,
      cardsLength: cards.length,
    });
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        <InsightDebugPanel debug={insightArtifact?.debug} />

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">Loading reflections...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {computeError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-rose-400 mb-2">Computation Error</h3>
                <p className="text-sm text-white/70">{computeError.message}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && reflections.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">
              No reflections yet. Start writing reflections to see lifetime insights.
            </p>
          </div>
        )}

        {!loading && !error && !computeError && reflections.length > 0 && (() => {
          const cards = insightArtifact?.cards ?? [];
          const lifetimeCard = cards.find((c) => c.kind === 'distribution');
          const hasLifetimeCard = !!lifetimeCard;

          // Show loading state
          if (isComputing) {
            return (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-white/60">
                  Computing lifetime insights...
                </p>
              </div>
            );
          }

          // Show content if card exists
          if (hasLifetimeCard && distributionResult && windowDistribution) {
            const activeDays = computeActiveDays(distributionResult.dailyCounts);
            const topSpikeDates = getTopSpikeDates(distributionResult, 5);
            const topDay = distributionResult.topDays[0]; // Deterministic: count desc, then date desc (most recent wins ties)
            const spikeRatio = distributionResult.stats.spikeRatio;
            const top10Share = distributionResult.stats.top10PercentDaysShare;

            // Dev log: Verify topDays[0] matches narrative
            if (process.env.NODE_ENV === 'development' && topDay) {
              console.log('[Lifetime] topDays[0] for Most Intense Day:', {
                date: topDay.date,
                count: topDay.count,
                formatted: new Date(topDay.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }),
              });
            }

            return (
              <div className="space-y-6">
                {/* Lifetime Distribution Card */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
                  <h2 className="text-lg font-medium text-emerald-200">Lifetime Distribution</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-white/50 mb-1">Total Reflections</div>
                      <div className="text-2xl font-semibold">{distributionResult.totalEntries}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 mb-1">Active Days</div>
                      <div className="text-2xl font-semibold">{activeDays}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 mb-1">Spike Ratio</div>
                      <div className="text-2xl font-semibold">{spikeRatio.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50 mb-1">Top 10% Share</div>
                      <div className="text-2xl font-semibold">{Math.round(top10Share * 100)}%</div>
                    </div>
                  </div>

                  {topDay && (
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-xs text-white/50 mb-1">Most Intense Day</div>
                      <div className="text-sm text-white/70">
                        {new Date(topDay.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} with {topDay.count} entries
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10">
                    <div className="text-xs text-white/50 mb-1">Distribution Pattern</div>
                    <div className="text-sm text-white/70 capitalize">
                      {windowDistribution.classification === 'lognormal' ? 'Log Normal' : 
                       windowDistribution.classification === 'powerlaw' ? 'Power Law' : 
                       'Normal'}
                    </div>
                    <p className="text-xs text-white/50 mt-2">{lifetimeCard?.explanation}</p>
                  </div>

                  {topSpikeDates.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-xs text-white/50 mb-2">Top Days</div>
                      <div className="space-y-1">
                        {topSpikeDates.map((date, idx) => {
                          const dayData = distributionResult.topDays.find(d => d.date === date);
                          return (
                            <div key={date} className="text-xs text-white/60">
                              {new Date(date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}: {dayData?.count || 0} entries
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Share Actions Bar */}
                <ShareActionsBar
                  artifact={null}
                  senderWallet={address}
                  encryptionReady={encryptionReady}
                />
              </div>
            );
          }

          // Show empty state if no card
          return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-white/60">
                Computing lifetime insights...
              </p>
            </div>
          );
        })()}
      </section>
    </div>
  );
}
