// src/app/insights/timeline/page.tsx
// Timeline lens - Activity spikes, clusters, and topic drift over time
// Task D: Thin wrapper route that loads entries, computes, renders

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import type { ReflectionEntry } from '../../lib/insights/types';
import type { TimelineSpikeCard, LinkClusterCard } from '../../lib/insights/types';
import type { TopicDriftBucket } from '../../lib/insights/topicDrift';
import type { ContrastPair } from '../../lib/insights/contrastPairs';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import { InsightDrawer, normalizeInsight } from '../components/InsightDrawer';
import { TimelineSectionSkeleton } from '../components/InsightsSkeleton';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { generateTimelineArtifact } from '../../lib/artifacts/timelineArtifact';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import { Sparkline } from '../../components/Sparkline';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';

/**
 * Compute trend summary counts from topic drift buckets
 */
function computeTrendSummary(buckets: TopicDriftBucket[]): {
  risingCount: number;
  stableCount: number;
  fadingCount: number;
  label: string;
} {
  const risingCount = buckets.filter(b => b.trend === 'rising').length;
  const fadingCount = buckets.filter(b => b.trend === 'fading').length;
  const stableCount = buckets.filter(b => b.trend === 'stable').length;
  
  const parts: string[] = [];
  if (risingCount > 0) parts.push(`${risingCount} rising`);
  if (fadingCount > 0) parts.push(`${fadingCount} fading`);
  if (stableCount > 0) parts.push(`${stableCount} stable`);
  
  return {
    risingCount,
    stableCount,
    fadingCount,
    label: parts.length > 0 ? parts.join(', ') : 'No trends detected',
  };
}

export default function TimelinePage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spikeInsights, setSpikeInsights] = useState<TimelineSpikeCard[]>([]);
  const [clusterInsights, setClusterInsights] = useState<LinkClusterCard[]>([]);
  const [topicDrift, setTopicDrift] = useState<TopicDriftBucket[]>([]);
  const [contrastPairs, setContrastPairs] = useState<ContrastPair[]>([]);
  const [timelineArtifact, setTimelineArtifact] = useState<import('../../lib/lifetimeArtifact').ShareArtifact | null>(null);
  const [insightArtifact, setInsightArtifact] = useState<InsightArtifact | null>(null);
  const [showTimelineCapsuleDialog, setShowTimelineCapsuleDialog] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [selectedOriginalCard, setSelectedOriginalCard] = useState<any>(null);
  const [expandedSpikes, setExpandedSpikes] = useState<Set<string>>(new Set());

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

  // Compute timeline insights via canonical engine
  useEffect(() => {
    if (reflections.length === 0 || !address) {
      setSpikeInsights([]);
      setClusterInsights([]);
      setTopicDrift([]);
      setContrastPairs([]);
      return;
    }

    try {
      // Convert reflections to UnifiedInternalEvent format (same pattern as Weekly/Summary)
      const walletAlias = address.toLowerCase();
      const eventsBeforeFilter = reflections.map((r) => ({
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

      // Dev-only logging: verify no silent filtering
      if (process.env.NODE_ENV === 'development') {
        console.log('[Timeline Debug] Event count before filter:', eventsBeforeFilter.length);
      }

      // Determine window: use all available reflections (or last 90 days)
      const now = new Date();
      const windowEnd = now;
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - 90);

      // No date/type/limit filtering applied - events passed directly to engine
      const events = eventsBeforeFilter;

      // Dev-only logging: verify no filtering occurred
      if (process.env.NODE_ENV === 'development') {
        console.log('[Timeline Debug] Event count after filter:', events.length);
        if (events.length !== eventsBeforeFilter.length) {
          console.warn('[Timeline Debug] WARNING: Events were filtered! Before:', eventsBeforeFilter.length, 'After:', events.length);
        }
      }

      // Compute timeline artifact via canonical engine
      const artifact = computeInsightsForWindow({
        horizon: 'timeline',
        events,
        windowStart,
        windowEnd,
        wallet: address ?? undefined,
        entriesCount: reflections.length,
        eventsCount: events.length,
        reflectionsLoaded: reflections.length,
        eventsGenerated: events.length,
      });

      // Store artifact for debug panel
      setInsightArtifact(artifact);

      // Extract cards from artifact and reconstruct original types
      const cards = artifact.cards ?? [];
      
      // Filter cards by kind to reconstruct original types
      const spikes: TimelineSpikeCard[] = cards.filter((c): c is TimelineSpikeCard => c.kind === 'timeline_spike');
      const clusters: LinkClusterCard[] = cards.filter((c): c is LinkClusterCard => c.kind === 'link_cluster');
      
      // Extract TopicDriftBucket from cards with metadata
      const topicDriftBuckets: TopicDriftBucket[] = cards
        .map((c) => (c as any)._topicDriftBucket)
        .filter((b): b is TopicDriftBucket => b !== undefined);
      
      // Extract ContrastPair from cards with metadata
      const contrastPairsData: ContrastPair[] = cards
        .map((c) => (c as any)._contrastPair)
        .filter((p): p is ContrastPair => p !== undefined);

      setSpikeInsights(spikes);
      setClusterInsights(clusters);
      setTopicDrift(topicDriftBuckets);
      setContrastPairs(contrastPairsData);
    } catch (err) {
      console.error('Failed to compute timeline insights:', err);
      setSpikeInsights([]);
      setClusterInsights([]);
      setTopicDrift([]);
      setContrastPairs([]);
    }
  }, [reflections, address]);

  // Generate timeline artifact
  useEffect(() => {
    if (!address || reflections.length === 0) {
      setTimelineArtifact(null);
      return;
    }

    generateTimelineArtifact(reflections, address).then(setTimelineArtifact).catch((err) => {
      console.error('Failed to generate timeline artifact', err);
      setTimelineArtifact(null);
    });
  }, [reflections, address]);

  // Compute timeline daily data for sparkline
  const timelineDailyData = useMemo(() => {
    if (reflections.length === 0) {
      return { dailyCounts: [], dates: [], hasData: false };
    }

    const countsByDay = new Map<string, number>();
    const dates: string[] = [];

    for (const entry of reflections) {
      const dateKey = new Date(entry.createdAt).toISOString().split('T')[0];
      countsByDay.set(dateKey, (countsByDay.get(dateKey) || 0) + 1);
      if (!dates.includes(dateKey)) {
        dates.push(dateKey);
      }
    }

    dates.sort();
    const dailyCounts = dates.map(date => countsByDay.get(date) || 0);

    return {
      dailyCounts,
      dates,
      hasData: dailyCounts.some(c => c > 0),
    };
  }, [reflections]);

  const isExpanded = (dateKey: string) => expandedSpikes.has(dateKey);
  const toggleExpanded = (dateKey: string) => {
    setExpandedSpikes(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // Helper to check if insight has source evidence
  function hasSourceEvidence(card: TimelineSpikeCard | LinkClusterCard, reflectionEntries: ReflectionEntry[]): boolean {
    const entryMap = new Map(reflectionEntries.map(e => [e.id, e]));
    return card.evidence.some(ev => {
      const entry = entryMap.get(ev.entryId);
      return entry?.sourceId !== undefined;
    });
  }

  function getSourceNameForInsight(card: TimelineSpikeCard | LinkClusterCard, reflectionEntries: ReflectionEntry[]): string | null {
    const entryMap = new Map(reflectionEntries.map(e => [e.id, e]));
    for (const ev of card.evidence) {
      const entry = entryMap.get(ev.entryId);
      if (entry?.sourceId) {
        // Would need source lookup - simplified for now
        return null;
      }
    }
    return null;
  }

  function getSourceKindForInsight(card: TimelineSpikeCard | LinkClusterCard, reflectionEntries: ReflectionEntry[]): string | null {
    const entryMap = new Map(reflectionEntries.map(e => [e.id, e]));
    for (const ev of card.evidence) {
      const entry = entryMap.get(ev.entryId);
      if (entry?.sourceId) {
        // Would need source lookup - simplified for now
        return null;
      }
    }
    return null;
  }

  if (!mounted) return null;

  const lens = LENSES.timeline;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        <InsightDebugPanel debug={insightArtifact?.debug} />

        {loading && (
          <div className="space-y-4">
            <TimelineSectionSkeleton />
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
              No reflections yet. Start writing reflections to see your timeline.
            </p>
          </div>
        )}

        {!loading && !error && reflections.length > 0 && (
          <div className="space-y-8">
            {/* Timeline Overview with Sparkline */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Timeline Overview
              </h2>

              {!timelineDailyData.hasData ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                  <p className="text-sm text-white/60">
                    No activity yet in this window
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <Sparkline 
                    dailyCounts={timelineDailyData.dailyCounts} 
                    dates={timelineDailyData.dates}
                    isLoading={false}
                  />
                </div>
              )}
            </div>

            {/* Share Actions */}
            <ShareActionsBar
              artifact={timelineArtifact}
              senderWallet={address}
              encryptionReady={encryptionReady}
              onSendPrivately={() => setShowTimelineCapsuleDialog(true)}
            />

            {/* Timeline Spikes Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
                Timeline Spikes
              </h2>

              {spikeInsights.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-sm text-white/60">
                    No writing spikes detected yet. Keep adding reflections — when you have days with unusually high activity, they&apos;ll show up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {spikeInsights.map((spike, spikeIndex) => {
                    const dateKey = spike.data.date;
                    const expanded = isExpanded(dateKey);
                    const visibleCount = expanded ? spike.evidence.length : 5;
                    const visibleEntries = spike.evidence.slice(0, visibleCount);
                    const hiddenCount = spike.evidence.length - 5;
                    const hasMore = spike.evidence.length > 5;

                    return (
                      <div
                        key={String(spike.id) || `spike-${dateKey}-${spikeIndex}`}
                        className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3 cursor-pointer hover:bg-amber-500/10 transition-colors"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          const normalized = normalizeInsight(spike);
                          setSelectedInsight(normalized);
                          setSelectedOriginalCard(spike);
                          setDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-amber-200">{spike.title}</h3>
                            {hasSourceEvidence(spike, reflections) && (
                              <div className="mt-1.5">
                                <span className="inline-flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                  From source
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                              {spike.data.count} entries
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-white/70">{spike.explanation}</p>

                        {spike.evidence.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-white/50 uppercase tracking-wide">
                              Entries on this day
                            </p>
                            <ul className="space-y-1.5">
                              {visibleEntries.map((ev, evIndex) => (
                                <li
                                  key={String(ev.entryId) || `evidence-${dateKey}-${evIndex}`}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="text-white/40 min-w-[60px]">
                                    {new Date(ev.timestamp).toLocaleTimeString(undefined, {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-white/60 truncate">
                                    {ev.preview || '(no preview)'}
                                  </span>
                                </li>
                              ))}
                              {hasMore && (
                                <li className="pl-[68px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpanded(dateKey);
                                    }}
                                    className="text-xs text-white/50 hover:text-white/70 underline"
                                  >
                                    {expanded ? 'Show less' : `+${hiddenCount} more`}
                                  </button>
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Link Clusters Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
                Link Clusters
              </h2>

              {clusterInsights.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-sm text-white/60">
                    No clusters detected yet. When you have reflections with similar themes, they&apos;ll be grouped here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clusterInsights.map((cluster, clusterIndex) => (
                    <div
                      key={String(cluster.id) || `cluster-${clusterIndex}`}
                      className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3 cursor-pointer hover:bg-violet-500/10 transition-colors"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        const normalized = normalizeInsight(cluster);
                        setSelectedInsight(normalized);
                        setSelectedOriginalCard(cluster);
                        setDrawerOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-violet-200">{cluster.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                            {cluster.data.clusterSize} entries
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-white/70">{cluster.explanation}</p>

                      {cluster.data.topTokens.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {cluster.data.topTokens.map((token) => (
                            <span
                              key={token}
                              className="text-xs text-violet-300 bg-violet-500/10 px-2 py-1 rounded-full"
                            >
                              {token}
                            </span>
                          ))}
                        </div>
                      )}

                      {cluster.evidence.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-white/50 uppercase tracking-wide">
                            Related entries
                          </p>
                          <ul className="space-y-1.5">
                            {cluster.evidence.slice(0, 4).map((ev) => (
                              <li
                                key={ev.entryId}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="text-white/40 min-w-[80px]">
                                  {new Date(ev.timestamp).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="text-white/60 truncate">
                                  {ev.preview || '(no preview)'}
                                </span>
                              </li>
                            ))}
                            {cluster.evidence.length > 4 && (
                              <li className="text-xs text-white/40 pl-[88px]">
                                +{cluster.evidence.length - 4} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trend Summary Strip */}
            {topicDrift.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                  </svg>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/60">Trend summary</span>
                    <span className="text-white/20">·</span>
                    <span className="text-xs text-white/50">{computeTrendSummary(topicDrift).label}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Topic Drift Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                Topic Drift
              </h2>

              {topicDrift.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-sm text-white/60">
                    Write a few more reflections and we&apos;ll start showing how your topics move over time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topicDrift.map((bucket, idx) => {
                    const trendStyles = {
                      rising: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      stable: 'bg-white/10 text-white/60 border-white/20',
                      fading: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    };
                    const trendLabels = {
                      rising: 'Rising',
                      stable: 'Stable',
                      fading: 'Fading',
                    };
                    
                    const strengthStyles = {
                      high: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                      low: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
                    };
                    const strengthLabels = {
                      high: 'High Drift',
                      medium: 'Medium Drift',
                      low: 'Low Drift',
                    };

                    return (
                      <div
                        key={String(bucket.topic) || `topic-${idx}`}
                        className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5 space-y-3 cursor-pointer hover:bg-teal-500/10 transition-colors"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          const normalized = normalizeInsight({
                            id: `topic-${bucket.topic}`,
                            kind: 'topic_cluster',
                            title: bucket.topic,
                            explanation: `Trend: ${trendLabels[bucket.trend]}, Strength: ${strengthLabels[bucket.strengthLabel]}`,
                            evidence: [],
                            computedAt: new Date().toISOString(),
                          });
                          setSelectedInsight(normalized);
                          setSelectedOriginalCard(null);
                          setDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-teal-200 capitalize">{bucket.topic}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${trendStyles[bucket.trend]}`}>
                              {trendLabels[bucket.trend]}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${strengthStyles[bucket.strengthLabel]}`}>
                              {strengthLabels[bucket.strengthLabel]}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-white/70">
                          {bucket.count} mentions in the last 28 days
                        </p>

                        {bucket.sampleTitles.length > 0 && (
                          <ul className="space-y-1">
                            {bucket.sampleTitles.slice(0, 3).map((title, idx) => (
                              <li
                                key={idx}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="text-teal-400/60">•</span>
                                <span className="text-white/60 truncate">{title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contrast Pairs Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                Contrast Pairs
              </h2>

              {contrastPairs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
                  Not enough data yet. Keep writing and we will show where your themes pull in opposite directions.
                </div>
              ) : (
                <div className="space-y-4">
                  {contrastPairs.slice(0, 2).map((pair, index) => {
                    const insightId = `contrastPairs-${pair.topicA}-${pair.topicB}-${index}`;
                    const trendStyles = {
                      rising: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      stable: 'bg-white/10 text-white/60 border-white/20',
                      fading: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    };
                    
                    return (
                      <div
                        key={insightId}
                        className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-4 cursor-pointer hover:bg-orange-500/10 transition-colors"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          const normalized = normalizeInsight(pair, index);
                          setSelectedInsight(normalized);
                          setSelectedOriginalCard(null);
                          setDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-orange-200 capitalize">{pair.topicA}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${trendStyles[pair.trendA]}`}>
                                Rising
                              </span>
                              <span className="text-white/30">vs</span>
                              <span className="font-medium text-orange-200 capitalize">{pair.topicB}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${trendStyles[pair.trendB]}`}>
                                Fading
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-white/70">
                          {pair.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insight Detail Drawer */}
        <InsightDrawer
          insight={selectedInsight}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedInsight(null);
            setSelectedOriginalCard(null);
          }}
          originalCard={selectedOriginalCard ?? undefined}
          reflectionEntries={reflections}
        />
      </section>
    </div>
  );
}

