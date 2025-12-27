'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeDistributionLayer, computeDistributionLayerLegacy, computeDistributionInsight, type WindowDistribution, type DistributionResult } from '../../lib/insights/distributionLayer';
import type { ReflectionEntry, InsightCard } from '../../lib/insights/types';
import { useHighlights } from '../../lib/insights/useHighlights';
import { rpcInsertEntry } from '../../lib/entries';
import { toast } from 'sonner';

export default function DistributionsPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const { isHighlighted, toggleHighlight } = useHighlights();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [distributions, setDistributions] = useState<WindowDistribution[]>([]);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [distributionInsight, setDistributionInsight] = useState<InsightCard | null>(null);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_insights');
  }, [mounted, connected, logEvent]);

  // Load reflections
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    if (!encryptionReady || !sessionKey) return;

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
          limit: 500,
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
  }, [mounted, connected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Compute distributions when reflections are loaded
  useEffect(() => {
    if (reflections.length === 0) {
      setDistributions([]);
      setDistributionResult(null);
      setDistributionInsight(null);
      return;
    }

    // Compute detailed distribution result (30-day window)
    const result = computeDistributionLayer(reflections, { windowDays: 30 });
    setDistributionResult(result);
    
    // Compute legacy distributions for table view
    const computed = computeDistributionLayerLegacy(reflections);
    setDistributions(computed);
    
    const insight = computeDistributionInsight(reflections);
    setDistributionInsight(insight);
  }, [reflections]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format classification label
  const formatClassification = (classification: string): string => {
    if (classification === 'lognormal') return 'Log Normal';
    if (classification === 'powerlaw') return 'Power Law';
    return 'Normal';
  };

  // Handle saving highlight to Supabase (reusing existing entry save pattern)
  const handleSaveHighlight = async () => {
    // Gate: wallet connection
    if (!connected || !address) {
      toast.error('Connect wallet to save');
      return;
    }

    // Gate: encryption session
    if (!encryptionReady || !sessionKey) {
      toast.error('Unlock vault to save');
      return;
    }

    // Gate: must have insight
    if (!distributionInsight) {
      toast.error('No insight to save');
      return;
    }

    try {
      // Get 30-day distribution for metadata
      const dist30 = distributions.find(d => d.windowDays === 30);
      
      // Build highlight payload (same pattern as other entries)
      const highlightPayload = {
        type: 'highlight',
        subtype: 'distribution-layer',
        title: distributionInsight.title,
        body: distributionInsight.explanation,
        evidence: distributionInsight.evidence.map(ev => ({
          entryId: ev.entryId,
          timestamp: ev.timestamp,
          preview: ev.preview,
        })),
        metadata: {
          insightId: distributionInsight.id,
          kind: distributionInsight.kind,
          computedAt: distributionInsight.computedAt,
          // Include distribution params
          windowDays: 30,
          classification: dist30?.classification || 'unknown',
          topSpikeDates: dist30?.topSpikeDates || [],
          frequencyPerDay: dist30?.frequencyPerDay || 0,
          magnitudeProxy: dist30?.magnitudeProxy || 0,
          // Include computed stats (if available)
          ...(distributionResult ? {
            mostCommonDayCount: distributionResult.stats.mostCommonDayCount,
            variance: distributionResult.stats.variance,
            spikeRatio: distributionResult.stats.spikeRatio,
            top10PercentDaysShare: distributionResult.stats.top10PercentDaysShare,
          } : {}),
        },
        ts: Date.now(),
      };

      // Call the same helper used by other pages (rpcInsertEntry)
      await rpcInsertEntry(address, sessionKey, highlightPayload);

      // Also update localStorage for immediate UI feedback
      toggleHighlight(distributionInsight);

      // Toast success
      toast.success('Saved to Highlights');
    } catch (err: any) {
      console.error('Failed to save highlight', err);
      toast.error(err?.message ?? 'Failed to save highlight');
    }
  };

  if (!mounted) return null;

  // Show wallet/encryption messaging if not ready
  if (!connected) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Distribution Analysis</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">Connect your wallet to view distribution analysis.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!encryptionReady) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Distribution Analysis</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">
              {encryptionError || 'Encryption key not ready. Please sign the consent message.'}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-6">Distribution Analysis</h1>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">Loading reflections…</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && reflections.length === 0 && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">No reflections found. Start writing to see distribution analysis.</p>
          </div>
        )}

        {/* Distribution Stats */}
        {!loading && !error && distributionResult && distributionResult.totalEntries > 0 && (
          <div className="mb-8 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Distribution Profile (30 days)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Most Common Day Count</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.mostCommonDayCount}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Variance</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.variance.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Spike Ratio</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.spikeRatio.toFixed(2)}x</div>
                  <div className="text-xs text-white/40 mt-1">max day / median day</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Top 10% Days Share</div>
                  <div className="text-2xl font-bold text-white">{(distributionResult.stats.top10PercentDaysShare * 100).toFixed(1)}%</div>
                  <div className="text-xs text-white/40 mt-1">power law signal</div>
                </div>
              </div>
            </div>

            {/* Top Days List */}
            {distributionResult.topDays.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-md font-semibold mb-3">Top Days</h3>
                <div className="space-y-2">
                  {distributionResult.topDays.slice(0, 10).map((day, idx) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{formatDate(day.date)}</span>
                      <span className="text-white/90 font-medium">{day.count} entries</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Distribution Insight Card */}
        {!loading && !error && distributionInsight && (
          <div className="mb-8">
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
              {/* Card header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-orange-200">{distributionInsight.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isHighlighted(distributionInsight)) {
                        // Already highlighted - just toggle localStorage
                        toggleHighlight(distributionInsight);
                      } else {
                        // Not highlighted - save to Supabase
                        handleSaveHighlight();
                      }
                    }}
                    className="p-1 rounded-full transition-colors hover:bg-white/10"
                    title={isHighlighted(distributionInsight) ? 'Remove from highlights' : 'Save to Highlights'}
                  >
                    {isHighlighted(distributionInsight) ? (
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white/40 hover:text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Explanation */}
              <p className="text-sm text-white/70">{distributionInsight.explanation}</p>

              {/* Computed locally badge */}
              <p className="text-xs text-white/40">Computed locally</p>
            </div>
          </div>
        )}

        {/* Distributions Table */}
        {!loading && !error && distributions.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Window</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Classification</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Top 3 Spike Dates</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((dist) => (
                  <tr key={dist.windowDays} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-white/90 font-medium">{dist.windowDays}d</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        dist.classification === 'normal' 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : dist.classification === 'lognormal'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      }`}>
                        {formatClassification(dist.classification)}
                      </span>
                    </td>
                    <td className="p-4 text-white/70 text-sm">
                      {dist.topSpikeDates.length > 0 ? (
                        <ul className="space-y-1">
                          {dist.topSpikeDates.map((date, idx) => (
                            <li key={idx}>{formatDate(date)}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-white/40">No spikes</span>
                      )}
                    </td>
                    <td className="p-4 text-white/70 text-sm">{dist.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

