'use client';

/**
 * Weekly lens - Last 7 days insights
 * 
 * Weekly insights for the last 7 days. Focus, momentum, spikes.
 * Uses the insight engine with horizon: 'weekly' to compute cards.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import { getWindowStartEnd } from '../../lib/insights/timeWindows';
import type { ReflectionEntry } from '../../lib/insights/types';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import { InsightCardSkeleton } from '../components/InsightsSkeleton';
import { InsightPanel } from '../components/InsightPanel';
import { normalizeInsightCard } from '../../lib/insights/normalizeCard';
import Link from 'next/link';

export default function WeeklyPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lens = LENSES.weekly;

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

  // Compute weekly insights (rolling 7-day window)
  const weeklyCards = useMemo(() => {
    if (reflections.length === 0) return [];

    try {
      // Filter to last 7 days (rolling window, not calendar week)
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0); // Snap to start of day

      const recent = reflections.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return t >= start.getTime() && t <= now.getTime();
      });

      // Debug logging
      console.log("weekly rolling window", start.toISOString(), now.toISOString());
      console.log("weekly reflections total", reflections.length);
      console.log("weekly reflections last7", recent.length);
      
      if (recent.length === 0) return [];

      // Convert filtered reflections to events format expected by engine
      const events = recent.map((r) => ({
        eventAt: new Date(r.createdAt),
        kind: 'written' as const,
        sourceKind: r.sourceKind ?? 'journal' as const,
        sourceId: r.sourceId ?? null,
        plaintext: r.plaintext,
        length: r.plaintext.length,
        topics: [], // Will be extracted by engine if needed
      }));

      // Compute weekly artifact with rolling 7-day window
      const artifact = computeInsightsForWindow({
        horizon: 'weekly',
        events,
        windowStart: start,
        windowEnd: now,
        wallet: address ?? undefined,
        entriesCount: recent.length,
        eventsCount: events.length,
      });

      // Extract cards and normalize
      const cards = artifact.cards ?? [];
      console.log("weekly cards", cards.length, cards.map(c => c.headline ?? c.title ?? c.kind));
      return cards.map(normalizeInsightCard);
    } catch (err) {
      console.error('Failed to compute weekly insights:', err);
      return [];
    }
  }, [reflections, address]);


  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">Your encrypted activity from the last 7 days</p>

        <InsightsTabs />

        {loading && (
          <div className="mt-8 space-y-4">
            <InsightCardSkeleton />
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {!loading && !error && reflections.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60 mb-4">
              No reflections yet. Start writing reflections to see your weekly insights.
            </p>
            <Link
              href="/insights/summary"
              className="inline-block px-4 py-2 text-sm text-white/80 hover:text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
            >
              Back to Summary
            </Link>
          </div>
        )}

        {!loading && !error && reflections.length > 0 && (
          <div className="space-y-6">
            {/* Weekly Cards */}
            {weeklyCards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-white/60 mb-4">
                  No weekly insights yet. Write a few reflections this week and they&apos;ll appear here.
                </p>
                <Link
                  href="/insights/summary"
                  className="inline-block px-4 py-2 text-sm text-white/80 hover:text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Back to Summary
                </Link>
              </div>
            ) : (
              <InsightPanel insights={weeklyCards} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
