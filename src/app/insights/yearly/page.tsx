'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeDistributionLayer, computeWindowDistribution, computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from '../../lib/insights/distributionLayer';
import type { ReflectionEntry, InsightCard } from '../../lib/insights/types';
import { useHighlights } from '../../lib/insights/useHighlights';
import { rpcInsertEntry } from '../../lib/entries';
import { toast } from 'sonner';

export default function YearlyWrapPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const { isHighlighted, toggleHighlight } = useHighlights();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [windowDistribution, setWindowDistribution] = useState<WindowDistribution | null>(null);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_insights');
  }, [mounted, connected, logEvent]);

  // Load reflections (same pattern as Distributions page)
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
          limit: 1000, // Load more for yearly analysis
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

  // Compute yearly distribution (365 days)
  useEffect(() => {
    if (reflections.length === 0) {
      setDistributionResult(null);
      setWindowDistribution(null);
      return;
    }

    // Compute distribution for 365 days
    const result = computeDistributionLayer(reflections, { windowDays: 365 });
    setDistributionResult(result);
    
    // Also get window distribution for classification
    const windowDist = computeWindowDistribution(reflections, 365);
    setWindowDistribution(windowDist);
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

  // Compute narrative insight
  const narrativeInsight = useMemo<InsightCard | null>(() => {
    if (!distributionResult || !windowDistribution || distributionResult.totalEntries === 0) {
      return null;
    }

    const activeDays = computeActiveDays(distributionResult.dailyCounts);
    const topSpikeDates = getTopSpikeDates(distributionResult, 3);
    const topDay = distributionResult.topDays[0];
    const biggestSpikeDay = topDay ? formatDate(topDay.date) : null;
    const top10PercentShare = distributionResult.stats.top10PercentDaysShare;

    const classification = windowDistribution.classification;
    const classificationLabel = formatClassification(classification);

    // Build narrative
    const title = `Your year followed a ${classificationLabel.toLowerCase()} pattern`;
    
    let body = `You wrote ${distributionResult.totalEntries} reflections across ${activeDays} active days. `;
    
    if (top10PercentShare > 0.5) {
      body += `Your most intense days account for ${Math.round(top10PercentShare * 100)}% of your total output. `;
    } else {
      body += `Your writing was spread across ${activeDays} days. `;
    }
    
    if (biggestSpikeDay) {
      body += `Your biggest day was ${biggestSpikeDay} with ${topDay.count} entries.`;
    }

    return {
      id: `yearly-wrap-${Date.now()}`,
      kind: 'distribution',
      title,
      explanation: body,
      evidence: topSpikeDates.slice(0, 3).map((date, idx) => {
        const dayData = distributionResult.topDays.find(d => d.date === date);
        return {
          entryId: `spike-${idx}`,
          timestamp: new Date(date).toISOString(),
          preview: `${dayData?.count || 0} entries on ${formatDate(date)}`,
        };
      }),
      computedAt: new Date().toISOString(),
    };
  }, [distributionResult, windowDistribution]);

  // Handle saving highlight
  const handleSaveHighlight = async () => {
    if (!connected || !address) {
      toast.error('Connect wallet to save');
      return;
    }

    if (!encryptionReady || !sessionKey) {
      toast.error('Unlock vault to save');
      return;
    }

    if (!narrativeInsight || !distributionResult || !windowDistribution) {
      toast.error('No insight to save');
      return;
    }

    try {
      const topSpikeDates = getTopSpikeDates(distributionResult, 3);
      const activeDays = computeActiveDays(distributionResult.dailyCounts);

      const highlightPayload = {
        type: 'highlight',
        subtype: 'yearly_wrap',
        title: narrativeInsight.title,
        body: narrativeInsight.explanation,
        evidence: narrativeInsight.evidence.map(ev => ({
          entryId: ev.entryId,
          timestamp: ev.timestamp,
          preview: ev.preview,
        })),
        metadata: {
          insightId: narrativeInsight.id,
          kind: narrativeInsight.kind,
          computedAt: narrativeInsight.computedAt,
          windowDays: 365,
          classification: windowDistribution.classification,
          totalEntries: distributionResult.totalEntries,
          activeDays,
          topDays: distributionResult.topDays.slice(0, 10),
          spikeDates: topSpikeDates,
          mostCommonDayCount: distributionResult.stats.mostCommonDayCount,
          variance: distributionResult.stats.variance,
          spikeRatio: distributionResult.stats.spikeRatio,
          top10PercentDaysShare: distributionResult.stats.top10PercentDaysShare,
          narrative: narrativeInsight.explanation,
        },
        ts: Date.now(),
      };

      await rpcInsertEntry(address, sessionKey, highlightPayload);
      toggleHighlight(narrativeInsight);
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
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">Connect your wallet to view your yearly wrap.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!encryptionReady) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
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
        <h1 className="text-2xl font-semibold text-center mb-6">Yearly Wrap</h1>

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
        {!loading && !error && (!distributionResult || distributionResult.totalEntries === 0) && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">No reflections found in the last 365 days. Start writing to see your yearly wrap.</p>
          </div>
        )}

        {/* Yearly Wrap Content */}
        {!loading && !error && distributionResult && distributionResult.totalEntries > 0 && (
          <div className="space-y-6">
            {/* Narrative Insight Card */}
            {narrativeInsight && (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-orange-200">{narrativeInsight.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isHighlighted(narrativeInsight)) {
                          toggleHighlight(narrativeInsight);
                        } else {
                          handleSaveHighlight();
                        }
                      }}
                      className="p-1 rounded-full transition-colors hover:bg-white/10"
                      title={isHighlighted(narrativeInsight) ? 'Remove from highlights' : 'Save to Highlights'}
                    >
                      {isHighlighted(narrativeInsight) ? (
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
                <p className="text-sm text-white/70">{narrativeInsight.explanation}</p>
                <p className="text-xs text-white/40">Computed locally</p>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Year in Numbers</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Total Entries</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.totalEntries}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Active Days</div>
                  <div className="text-2xl font-bold text-white">{computeActiveDays(distributionResult.dailyCounts)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Top 10% Days Share</div>
                  <div className="text-2xl font-bold text-white">{(distributionResult.stats.top10PercentDaysShare * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Spike Ratio</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.spikeRatio.toFixed(2)}x</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Variance</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.variance.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Classification</div>
                  <div className="text-2xl font-bold text-white">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      windowDistribution?.classification === 'normal' 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : windowDistribution?.classification === 'lognormal'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}>
                      {windowDistribution ? formatClassification(windowDistribution.classification) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 10 Days */}
            {distributionResult.topDays.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-md font-semibold mb-3">Top 10 Days</h3>
                <div className="space-y-2">
                  {distributionResult.topDays.slice(0, 10).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{formatDate(day.date)}</span>
                      <span className="text-white/90 font-medium">{day.count} entries</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distribution Table (365d window) */}
            {windowDistribution && (
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
                    <tr className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-white/90 font-medium">365d</td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          windowDistribution.classification === 'normal' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : windowDistribution.classification === 'lognormal'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}>
                          {formatClassification(windowDistribution.classification)}
                        </span>
                      </td>
                      <td className="p-4 text-white/70 text-sm">
                        {windowDistribution.topSpikeDates.length > 0 ? (
                          <ul className="space-y-1">
                            {windowDistribution.topSpikeDates.map((date, idx) => (
                              <li key={idx}>{formatDate(date)}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-white/40">No spikes</span>
                        )}
                      </td>
                      <td className="p-4 text-white/70 text-sm">{windowDistribution.explanation}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
