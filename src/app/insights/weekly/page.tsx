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
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import Link from 'next/link';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';

export default function WeeklyPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<InsightArtifact | null>(null);

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

  // Compute weekly insights - filter events to weekly window before passing to engine
  const { weeklyCards, eventsInWindow } = useMemo(() => {
    if (reflections.length === 0 || !address) return { weeklyCards: [], eventsInWindow: 0 };

    try {
      // Get current week window (Monday 00:00 through next Monday 00:00)
      // Use local time calculation for accurate week boundaries
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const diffToMonday = (day + 6) % 7; // Days to subtract to get to Monday
      const start = new Date(now);
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      // Convert all reflections to UnifiedInternalEvent format
      const walletAlias = address.toLowerCase();
      const eventsAll = reflections.map((r) => ({
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

      // Filter events to weekly window (engine expects pre-filtered events)
      const events = eventsAll.filter((e) => {
        const dt = new Date(e.eventAt);
        return dt >= start && dt < end;
      });

      if (events.length === 0) return { weeklyCards: [], eventsInWindow: 0 };

      // Compute weekly artifact with filtered events
      const artifact = computeInsightsForWindow({
        horizon: 'weekly',
        events,
        windowStart: start,
        windowEnd: end,
        wallet: address ?? undefined,
        entriesCount: reflections.length,
        eventsCount: events.length,
        reflectionsLoaded: reflections.length,
        eventsGenerated: eventsAll.length, // Total events generated before filtering
      });

      // Extract cards and normalize
      const cards = artifact.cards ?? [];
      const normalizedCards = cards.map(normalizeInsightCard);
      
      // Store artifact for debug panel
      setArtifact(artifact);
      
      return {
        weeklyCards: normalizedCards,
        eventsInWindow: events.length,
      };
    } catch (err) {
      console.error('Failed to compute weekly insights:', err);
      return { weeklyCards: [], eventsInWindow: 0 };
    }
  }, [reflections, address]);


  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        <InsightDebugPanel debug={artifact?.debug} />

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
              No reflections yet.
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
            {eventsInWindow === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-white/60 mb-4">
                  No reflections this week yet.
                </p>
                <Link
                  href="/insights/summary"
                  className="inline-block px-4 py-2 text-sm text-white/80 hover:text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Back to Summary
                </Link>
              </div>
            ) : weeklyCards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-white/60 mb-4">
                  No weekly insights yet. Keep writing reflections and they&apos;ll appear here.
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
