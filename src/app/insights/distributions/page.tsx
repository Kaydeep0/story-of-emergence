'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeDistributionLayer, type WindowDistribution } from '../../lib/insights/distributionLayer';
import type { ReflectionEntry } from '../../lib/insights/types';

export default function DistributionsPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [distributions, setDistributions] = useState<WindowDistribution[]>([]);

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
      return;
    }

    const computed = computeDistributionLayer(reflections);
    setDistributions(computed);
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

