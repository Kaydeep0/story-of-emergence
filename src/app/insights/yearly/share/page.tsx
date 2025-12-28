'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../../lib/reflectionLinks';
import { computeDistributionLayer, computeWindowDistribution, computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from '../../../lib/insights/distributionLayer';
import type { ReflectionEntry } from '../../../lib/insights/types';
import { IdentityLine } from '../../../components/yearly/IdentityLine';
import { YearShapeGlyph } from '../../../components/yearly/YearShapeGlyph';
import { UnderlyingRhythmCard } from '../components/UnderlyingRhythmCard';

export default function YearlyWrapSharePage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [windowDistribution, setWindowDistribution] = useState<WindowDistribution | null>(null);
  const [identitySentence, setIdentitySentence] = useState<string>('');

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

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
  }, [mounted, connected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Compute yearly distribution (365 days)
  useEffect(() => {
    if (reflections.length === 0) {
      setDistributionResult(null);
      setWindowDistribution(null);
      return;
    }

    const result = computeDistributionLayer(reflections, { windowDays: 365 });
    setDistributionResult(result);
    
    const windowDist = computeWindowDistribution(reflections, 365);
    setWindowDistribution(windowDist);
  }, [reflections]);

  // Format classification label
  const formatClassification = (classification: string): string => {
    if (classification === 'lognormal') return 'Log Normal';
    if (classification === 'powerlaw') return 'Power Law';
    return 'Normal';
  };

  // Compute most common day count
  const mostCommonDayCount = useMemo(() => {
    if (!distributionResult || !distributionResult.dailyCounts || distributionResult.dailyCounts.length === 0) {
      return null;
    }

    const counts = distributionResult.dailyCounts.filter(c => c > 0);
    if (counts.length === 0) return null;

    const frequency = new Map<number, number>();
    counts.forEach(count => {
      frequency.set(count, (frequency.get(count) || 0) + 1);
    });

    const sorted = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  }, [distributionResult]);

  if (!mounted) return null;

  if (!connected) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-center text-white/60">Please connect your wallet to view your yearly wrap.</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-center text-white/60">Loading your yearly wrap...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-center text-red-400">Error: {error}</p>
        </section>
      </main>
    );
  }

  if (!distributionResult || distributionResult.totalEntries === 0 || !windowDistribution) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-center text-white/60">No data available for yearly wrap.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-4xl mx-auto px-4 py-10">
        {/* Year + meaning sentence */}
        <IdentityLine
          totalEntries={distributionResult.totalEntries}
          activeDays={computeActiveDays(distributionResult.dailyCounts)}
          spikeRatio={distributionResult.stats.spikeRatio}
          top10PercentShare={distributionResult.stats.top10PercentDaysShare}
          classification={windowDistribution.classification}
          onSentenceChange={setIdentitySentence}
          readOnly={true}
        />

        {/* Year shape visualization */}
        {distributionResult.dailyCounts.length > 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm text-white/70 mb-4 italic">This is how your attention actually moved.</p>
            <YearShapeGlyph
              dailyCounts={distributionResult.dailyCounts}
              topSpikeDates={getTopSpikeDates(distributionResult, 3)}
              mode="page"
            />
          </div>
        )}

        {/* Underlying rhythm stats */}
        <div className="mt-8">
          <UnderlyingRhythmCard
            distributionResult={distributionResult}
            windowDistribution={windowDistribution}
            mostCommonDayCount={mostCommonDayCount}
            formatClassification={formatClassification}
            readOnly={true}
          />
        </div>

        {/* Closing reflection */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <h3 className="text-lg font-semibold mb-3">A year, observed</h3>
          <p className="text-sm sm:text-base text-white/75 leading-relaxed">
            This wasn&apos;t a highlight reel. It was a record of attention, taken as it actually moved. Nothing here was optimized—only noticed.
          </p>
        </div>
      </section>
    </main>
  );
}

