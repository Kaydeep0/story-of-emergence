// src/app/insights/summary/page.tsx
// Summary lens - Always-on insights from recent activity
// Task D: Thin wrapper route that loads entries, computes, renders

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import { listExternalEntries } from '../../lib/useSources';
import { computeUnifiedSourceInsights } from '../../lib/insights/fromSources';
import { buildDistributionFromReflections } from '../../lib/distributions/buildSeries';
import { classifyDistribution } from '../../lib/distributions/classify';
import { generateDistributionInsight } from '../../lib/distributions/insights';
import { generateNarrative } from '../../lib/distributions/narratives';
import { filterEventsByWindow } from '../../lib/insights/timeWindows';
import type { DistributionShape } from '../../lib/distributions/classify';
import type { ReflectionEntry, InsightCard } from '../../lib/insights/types';
import type { UnifiedSourceInsights, SourceEntryLite } from '../../lib/insights/fromSources';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import { InsightCardSkeleton, SummaryStatsGridSkeleton } from '../components/InsightsSkeleton';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { NarrativeBlock } from '../components/NarrativeBlock';
import { InsightsSourceCard } from '../../components/InsightsSourceCard';
import { InsightPanel } from '../components/InsightPanel';
import { InsightTimeline } from '../components/InsightTimeline';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';
import { generateSummaryArtifact } from '../../lib/artifacts/summaryArtifact';

export default function SummaryPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryArtifactCards, setSummaryArtifactCards] = useState<InsightCard[]>([]);
  const [sources, setSources] = useState<SourceEntryLite[]>([]);
  const [sourceInsights, setSourceInsights] = useState<UnifiedSourceInsights | null>(null);
  const [summaryArtifact, setSummaryArtifact] = useState<import('../../lib/lifetimeArtifact').ShareArtifact | null>(null);
  const [insightArtifact, setInsightArtifact] = useState<InsightArtifact | null>(null);
  const [showSummaryCapsuleDialog, setShowSummaryCapsuleDialog] = useState(false);
  const [insightView, setInsightView] = useState<'panel' | 'timeline'>('panel');

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

  // Load sources
  useEffect(() => {
    if (!mounted || !isConnected || !address) return;

    let cancelled = false;

    async function loadSources() {
      if (!address) return;
      try {
        const sourcesList = await listExternalEntries(address);
        if (!cancelled) {
          setSources(sourcesList.map((s) => ({
            id: s.id,
            sourceId: s.sourceId ?? null,
            title: s.title ?? 'Untitled',
            kind: s.kind ?? null,
          })));
        }
      } catch {
        if (!cancelled) {
          setSources([]);
        }
      }
    }

    loadSources();
    return () => {
      cancelled = true;
    };
  }, [mounted, isConnected, address]);

  // Compute summary insights via canonical engine
  useEffect(() => {
    if (reflections.length === 0 || !address) {
      setSummaryArtifactCards([]);
      setSourceInsights(null);
      return;
    }

    try {
      // Convert reflections to UnifiedInternalEvent format (same pattern as Weekly)
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

      // Determine window: use last 90 days or all reflections if less than 90 days old
      const now = new Date();
      const windowEnd = now;
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - 90);

      // Compute summary artifact via canonical engine
      const artifact = computeInsightsForWindow({
        horizon: 'summary',
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

      // Extract cards from artifact
      const cards = artifact.cards ?? [];
      setSummaryArtifactCards(cards);
      setSourceInsights(computeUnifiedSourceInsights(sources, reflections));
    } catch (err) {
      console.error('Failed to compute summary insights:', err);
      setSummaryArtifactCards([]);
      setSourceInsights(null);
    }
  }, [reflections, sources, address]);

  // Generate distribution insights
  const distributionInsightCards = useMemo(() => {
    if (reflections.length === 0) return [];

    const now = new Date();
    const defaultShape: DistributionShape = 'normal';

    // Helper to build narrative for a time window
    const buildNarrativeForWindow = (days: number, scope: 'week' | 'month' | 'year') => {
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const windowReflections = filterEventsByWindow(reflections, start, now);
      
      if (windowReflections.length === 0) return null;

      // Build distribution series with 'day' bucket and default shape
      const series = buildDistributionFromReflections(windowReflections, 'day', defaultShape);
      
      // Classify to get actual shape
      const shape = classifyDistribution(series);
      
      // Generate insight
      const insight = generateDistributionInsight(series, shape);
      if (!insight) return null;

      // Generate narrative
      return generateNarrative(scope, insight, windowReflections.length);
    };

    // Adapter: Convert DistributionNarrative directly to canonical types.InsightCard
    // This avoids the viewModels intermediate type and ensures canonical contract
    const convertNarrativeToCanonicalCard = (
      narrative: NonNullable<ReturnType<typeof buildNarrativeForWindow>>,
      scope: 'week' | 'month' | 'year'
    ): InsightCard & { _scope: 'week' | 'month' | 'year'; _confidence: 'low' | 'medium' | 'high' } => {
      return {
        id: `distribution-${scope}-${narrative.headline.slice(0, 20).toLowerCase().replace(/\s+/g, '-')}`,
        kind: 'distribution' as const,
        title: narrative.headline,
        explanation: narrative.summary,
        evidence: [],
        computedAt: new Date().toISOString(),
        _scope: scope, // Store scope for conversion to InsightCardBase
        _confidence: narrative.confidence, // Store confidence for conversion
      };
    };

    const weekNarrative = buildNarrativeForWindow(7, 'week');
    const monthNarrative = buildNarrativeForWindow(30, 'month');
    const yearNarrative = buildNarrativeForWindow(365, 'year');

    const cards: InsightCard[] = [];
    if (weekNarrative) cards.push(convertNarrativeToCanonicalCard(weekNarrative, 'week'));
    if (monthNarrative) cards.push(convertNarrativeToCanonicalCard(monthNarrative, 'month'));
    if (yearNarrative) cards.push(convertNarrativeToCanonicalCard(yearNarrative, 'year'));

    return cards;
  }, [reflections]);

  // Generate summary artifact
  useEffect(() => {
    if (!address || reflections.length === 0) {
      setSummaryArtifact(null);
      return;
    }

    const addr = address; // Capture for closure
    generateSummaryArtifact(reflections, addr).then(setSummaryArtifact).catch((err) => {
      console.error('Failed to generate summary artifact', err);
      setSummaryArtifact(null);
    });
  }, [reflections, address]);

  // Build source reflections map
  const sourceReflectionsById = useMemo(() => {
    const map = new Map<string, ReflectionEntry[]>();
    for (const reflection of reflections) {
      if (reflection.sourceId) {
        const existing = map.get(reflection.sourceId) || [];
        map.set(reflection.sourceId, [...existing, reflection]);
      }
    }
    return map;
  }, [reflections]);

  if (!mounted) return null;

  const lens = LENSES.summary;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        <InsightDebugPanel debug={insightArtifact?.debug} />

        {loading && (
          <div className="space-y-4">
            <SummaryStatsGridSkeleton />
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
              No reflections yet. Start writing reflections to see summary insights.
            </p>
          </div>
        )}

        {!loading && !error && reflections.length > 0 && (
          <div className="space-y-6">
            {/* Share Actions */}
            <ShareActionsBar
              artifact={summaryArtifact}
              senderWallet={address}
              encryptionReady={encryptionReady}
              onSendPrivately={() => setShowSummaryCapsuleDialog(true)}
            />

            {/* Source-driven topics */}
            <section className="rounded-2xl bg-white/3 px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-normal text-white/80">Observed Patterns</p>
                <span className="text-[11px] text-white/40">External sources</span>
              </div>
              {sources.length === 0 ? (
                <p className="text-sm text-white/60">Connect a source to get topic insights.</p>
              ) : sourceReflectionsById.size === 0 ? (
                <p className="text-sm text-white/60">No source-driven insights yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {sources
                    .filter((s) => s.sourceId && sourceReflectionsById.has(s.sourceId))
                    .map((source) => {
                      const highlight =
                        sourceInsights?.highlights.find((h) => h.sourceId === source.sourceId)?.items?.[0];
                      const reflectionsForSource = sourceReflectionsById.get(source.sourceId!) ?? [];
                      return (
                        <InsightsSourceCard
                          key={source.sourceId ?? source.id}
                          source={source}
                          reflections={reflectionsForSource}
                          highlight={highlight}
                        />
                      );
                    })}
                </div>
              )}
            </section>

            {/* Always On Summary Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-normal flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
                Always On Summary
              </h2>

              {summaryArtifactCards.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-sm text-white/60">
                    Not enough recent activity yet. Keep writing and we&apos;ll show summary insights here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {summaryArtifactCards.map((card) => {
                    // Extract summaryType from card data if it's an AlwaysOnSummaryCard
                    const cardData = (card as any).data;
                    const summaryType = cardData?.summaryType;
                    
                    const typeLabels: Record<string, string> = {
                      writing_change: 'Trend',
                      consistency: 'Consistency',
                      weekly_pattern: 'Pattern',
                      activity_spike: 'Spike',
                    };
                    const typeColors: Record<string, string> = {
                      writing_change: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                      consistency: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      weekly_pattern: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
                      activity_spike: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    };

                    return (
                      <div
                        key={card.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white">{card.title}</h3>
                          </div>
                          {summaryType && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[summaryType] || 'bg-white/10 text-white/60 border-white/20'}`}
                            >
                              {typeLabels[summaryType] || summaryType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/70">{card.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Distribution Insights Panel */}
            {distributionInsightCards.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-50">
                    Distribution Insights
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInsightView('panel')}
                      className={`text-xs px-3 py-1 rounded border transition-colors ${
                        insightView === 'panel'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                      }`}
                    >
                      Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsightView('timeline')}
                      className={`text-xs px-3 py-1 rounded border transition-colors ${
                        insightView === 'timeline'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                      }`}
                    >
                      Timeline
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  {insightView === 'panel' ? (
                    <InsightPanel insights={distributionInsightCards.map(card => {
                      const cardWithMeta = card as InsightCard & { _scope?: 'week' | 'month' | 'year'; _confidence?: 'low' | 'medium' | 'high' };
                      return {
                        id: card.id,
                        scope: cardWithMeta._scope || 'week',
                        headline: card.title,
                        summary: card.explanation,
                        confidence: cardWithMeta._confidence || 'medium',
                      };
                    })} />
                  ) : (
                    <InsightTimeline insights={distributionInsightCards.map(card => {
                      const cardWithMeta = card as InsightCard & { _scope?: 'week' | 'month' | 'year'; _confidence?: 'low' | 'medium' | 'high' };
                      return {
                        id: card.id,
                        scope: cardWithMeta._scope || 'week',
                        headline: card.title,
                        summary: card.explanation,
                        confidence: cardWithMeta._confidence || 'medium',
                      };
                    })} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

