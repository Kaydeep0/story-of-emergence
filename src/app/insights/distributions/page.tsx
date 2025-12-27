'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeDistributionLayer, computeDistributionInsight, type WindowDistribution } from '../../lib/insights/distributionLayer';
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
      setDistributionInsight(null);
      return;
    }

    const computed = computeDistributionLayer(reflections);
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

  // Save highlight to Supabase
  const saveHighlightToSupabase = async (insight: InsightCard) => {
    if (!connected || !address) {
      toast.error('Connect wallet to save');
      return;
    }

    if (!encryptionReady || !sessionKey) {
      toast.error('Encryption key not ready');
      return;
    }

    try {
      // Save as an entry with highlight type
      await rpcInsertEntry(address, sessionKey, {
        type: 'highlight',
        insightId: insight.id,
        kind: insight.kind,
        title: insight.title,
        explanation: insight.explanation,
        computedAt: insight.computedAt,
        evidence: insight.evidence,
        ts: Date.now(),
      });

      // Also save to localStorage for immediate UI update
      toggleHighlight(insight);
      
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
                        saveHighlightToSupabase(distributionInsight);
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

