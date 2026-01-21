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
import { filterEventsByWindow, groupByDay } from '../../lib/insights/timeWindows';
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
import { InsightSignalCard } from '../components/InsightSignalCard';
import { MiniHistogram } from '../components/MiniHistogram';
import { LensTransition } from '../components/LensTransition';
import { interpretSpikeRatio, interpretTop10Share, interpretActiveDays, interpretEntryCount } from '../lib/metricInterpretations';
import { computeDistributionLayer, computeActiveDays } from '../../lib/insights/distributionLayer';
import { intensityFromSpikeRatio, intensityFromTop10Share, intensityFromEntryCount, type IntensityLevel } from '../lib/intensitySystem';
import { InsightTimeline } from '../components/InsightTimeline';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import { ObservationalDivider } from '../components/ObservationalDivider';
import { SessionClosing } from '../components/SessionClosing';
import { useDensity } from '../hooks/useDensity';
import { DensityToggle } from '../components/DensityToggle';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';
import { generateSummaryArtifact } from '../../lib/artifacts/summaryArtifact';
import { useNarrativeTone } from '../hooks/useNarrativeTone';
import { NarrativeToneSelector } from '../components/NarrativeToneSelector';
import { getLensPurposeCopy, getLensBoundaries } from '../lib/lensPurposeCopy';
import { DeterminismEmergenceAxis } from '../components/DeterminismEmergenceAxis';
import { buildSharePackForLens, type SharePack } from '../../lib/share/sharePack';
import { computeCrossLensPersistence } from '../../lib/observer/computeCrossLensPersistence';

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
  const { narrativeTone, handleToneChange } = useNarrativeTone(address, mounted);
  const { densityMode, handleDensityChange } = useDensity(address, mounted);

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

  // Compute Observer v1 persistence across Weekly and Yearly
  const persistenceResult = useMemo(() => {
    if (reflections.length === 0 || !address) {
      return null;
    }

    try {
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

      const now = new Date();

      // Compute Weekly artifact
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const weeklyStart = new Date(now);
      weeklyStart.setDate(now.getDate() - diffToMonday);
      weeklyStart.setHours(0, 0, 0, 0);
      const weeklyEnd = new Date(weeklyStart);
      weeklyEnd.setDate(weeklyStart.getDate() + 7);

      const weeklyEvents = events.filter((e) => {
        const eventDate = new Date(e.eventAt);
        return eventDate >= weeklyStart && eventDate < weeklyEnd;
      });

      const weeklyArtifact = computeInsightsForWindow({
        horizon: 'weekly',
        events: weeklyEvents,
        windowStart: weeklyStart,
        windowEnd: weeklyEnd,
        wallet: address,
        entriesCount: weeklyEvents.length,
        eventsCount: weeklyEvents.length,
        reflectionsLoaded: reflections.length,
        eventsGenerated: events.length,
      });

      // Compute Yearly artifact
      const yearlyStart = new Date(now);
      yearlyStart.setFullYear(now.getFullYear() - 1);
      const yearlyEnd = now;

      const yearlyEvents = events.filter((e) => {
        const eventDate = new Date(e.eventAt);
        return eventDate >= yearlyStart && eventDate <= yearlyEnd;
      });

      const yearlyArtifact = computeInsightsForWindow({
        horizon: 'yearly',
        events: yearlyEvents,
        windowStart: yearlyStart,
        windowEnd: yearlyEnd,
        wallet: address,
        entriesCount: yearlyEvents.length,
        eventsCount: yearlyEvents.length,
        reflectionsLoaded: reflections.length,
        eventsGenerated: events.length,
      });

      // Extract weekly reflections for distribution computation
      const weeklyReflections = reflections.filter((r) => {
        const createdAt = new Date(r.createdAt);
        return createdAt >= weeklyStart && createdAt < weeklyEnd;
      });

      // Use helper to compute persistence
      return computeCrossLensPersistence({
        weeklyArtifact,
        yearlyArtifact,
        weeklyReflections,
      });
    } catch (err) {
      console.error('Failed to compute persistence:', err);
      return null;
    }
  }, [reflections, address]);

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

  // Build SharePack from summary lens state - always returns a SharePack
  const sharePack = useMemo<SharePack>(() => {
    if (!address) {
      // Minimal fallback when no wallet connected
      return buildSharePackForLens({
        lens: 'summary',
        oneSentenceSummary: 'Summary',
        entryCount: 0,
        activeDays: 0,
        distributionLabel: 'none',
        concentrationShareTop10PercentDays: 0,
        spikeCount: 0,
        keyMoments: [],
        generatedAt: new Date().toISOString(),
      });
    }

    try {
      // Get summary window (last 90 days)
      const now = new Date();
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - 90);
      const windowReflections = filterEventsByWindow(reflections, windowStart, now);
      const byDay = groupByDay(windowReflections);

      // Compute metrics (always compute, even if empty)
      const entryCount = windowReflections.length;
      const activeDaysSet = new Set<string>();
      const dailyCounts: number[] = [];
      const keyMoments: Array<{ date: string }> = [];

      // Build daily counts and active days
      for (const reflection of windowReflections) {
        const dateKey = `${new Date(reflection.createdAt).getFullYear()}-${String(new Date(reflection.createdAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(reflection.createdAt).getDate()).padStart(2, '0')}`;
        if (!activeDaysSet.has(dateKey)) {
          activeDaysSet.add(dateKey);
        }
      }

      const activeDays = activeDaysSet.size;

      // Get daily counts for spike/concentration calculation
      for (let i = 89; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const count = byDay.get(dateKey)?.length || 0;
        dailyCounts.push(count);

        // Add as key moment if it's a spike day (≥3 entries)
        if (count >= 3) {
          keyMoments.push({ date: new Date(dateKey).toISOString() });
        }
      }

      // Compute spike count (days with ≥3 entries AND ≥2× median)
      const nonZeroCounts = dailyCounts.filter(c => c > 0);
      let spikeCount = 0;
      if (nonZeroCounts.length > 0) {
        const sortedNonZero = [...nonZeroCounts].sort((a, b) => a - b);
        const median = sortedNonZero.length % 2 === 0
          ? (sortedNonZero[sortedNonZero.length / 2 - 1] + sortedNonZero[sortedNonZero.length / 2]) / 2
          : sortedNonZero[Math.floor(sortedNonZero.length / 2)];
        const effectiveMedian = median > 0 ? median : 1;
        const spikeThreshold = Math.max(3, effectiveMedian * 2);
        spikeCount = dailyCounts.filter(count => count >= spikeThreshold && count >= 3).length;
      }

      // Compute concentration (top 10% days share)
      const sortedCounts = [...dailyCounts].sort((a, b) => b - a);
      const top10PercentCount = Math.max(1, Math.ceil(dailyCounts.length * 0.1));
      const top10PercentSum = sortedCounts.slice(0, top10PercentCount).reduce((a, b) => a + b, 0);
      const totalSum = dailyCounts.reduce((a, b) => a + b, 0);
      const concentration = totalSum > 0 ? top10PercentSum / totalSum : 0;

      // Get one sentence summary from primary card or fallback
      const primaryCard = summaryArtifactCards[0];
      const oneSentenceSummary = primaryCard?.title || 
        (entryCount > 0 ? `Summary of ${entryCount} reflection${entryCount === 1 ? '' : 's'}` : 'Summary');

      // Determine distribution label from distribution cards or default
      const distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none' = 
        entryCount === 0 ? 'none' :
        distributionInsightCards.length > 0 && distributionInsightCards[0].title.includes('power')
          ? 'powerlaw'
          : concentration > 0.4 ? 'powerlaw'
          : concentration > 0.2 ? 'lognormal'
          : 'normal';

      return buildSharePackForLens({
        lens: 'summary',
        oneSentenceSummary,
        entryCount,
        activeDays,
        distributionLabel,
        concentrationShareTop10PercentDays: concentration,
        spikeCount,
        keyMoments: keyMoments.slice(0, 5), // Top 5 spike days
        periodStart: windowStart.toISOString(),
        periodEnd: now.toISOString(),
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to build summary SharePack:', err);
      // Minimal fallback on error
      return buildSharePackForLens({
        lens: 'summary',
        oneSentenceSummary: 'Summary',
        entryCount: reflections.length,
        activeDays: 0,
        distributionLabel: 'none',
        concentrationShareTop10PercentDays: 0,
        spikeCount: 0,
        keyMoments: [],
        generatedAt: new Date().toISOString(),
      });
    }
  }, [reflections, address, summaryArtifactCards, distributionInsightCards]);

  if (!mounted) return null;

  const lens = LENSES.summary;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-normal">{lens.label}</h1>
            <p className="text-sm text-white/50 mt-1">{lens.description}</p>
          </div>
          <NarrativeToneSelector tone={narrativeTone} onToneChange={handleToneChange} />
        </div>

        {/* Why this lens exists */}
        <div className="mb-6 pb-6 border-b border-white/10">
          <p className="text-xs text-white/50 mb-1">Why this lens exists</p>
          <p className="text-sm text-white/60 leading-relaxed">{getLensPurposeCopy('summary', narrativeTone)}</p>
        </div>

        {/* Observer v1 persistence statement */}
        {persistenceResult?.speaks && (
          <div className="mb-4">
            <p className="text-xs text-white/40">{persistenceResult.sentence}</p>
          </div>
        )}

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
              sharePack={sharePack}
              senderWallet={address}
              encryptionReady={encryptionReady}
            />

            {/* Determinism-Emergence Axis */}
            {reflections.length >= 10 && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-sm font-medium text-white/70 mb-4">Constraint and Freedom</h2>
                <DeterminismEmergenceAxis reflections={reflections} narrativeTone={narrativeTone} />
              </section>
            )}

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

            {/* Transition to Distribution Insights */}
            {summaryArtifactCards.length > 0 && distributionInsightCards.length > 0 && (
              <LensTransition text="Short bursts compound into longer-term structure." />
            )}

            {/* Distribution Insights Panel */}
            {distributionInsightCards.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-50">
                  Distribution Insights
                </h2>
                <div className="space-y-4">
                  {distributionInsightCards.map((card, index) => {
                    const cardWithMeta = card as InsightCard & { _scope?: 'week' | 'month' | 'year'; _confidence?: 'low' | 'medium' | 'high' };
                    const scope = cardWithMeta._scope || 'week';
                    const isPrimary = index === 0;
                    
                    // Compute daily counts for visual based on scope
                    const now = new Date();
                    let sparklineValues: number[] = [];
                    let totalEntries = 0;
                    let windowReflections: typeof reflections = [];
                    
                    if (scope === 'week') {
                      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      windowReflections = filterEventsByWindow(reflections, start, now);
                      const byDay = groupByDay(windowReflections);
                      totalEntries = windowReflections.length;
                      
                      // Get daily counts for last 7 days
                      for (let i = 6; i >= 0; i--) {
                        const date = new Date(now);
                        date.setDate(now.getDate() - i);
                        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        sparklineValues.push(byDay.get(dateKey)?.length || 0);
                      }
                    } else if (scope === 'month') {
                      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      windowReflections = filterEventsByWindow(reflections, start, now);
                      const byDay = groupByDay(windowReflections);
                      totalEntries = windowReflections.length;
                      
                      // Downsample 30 days to 24 bars
                      const dailyCounts: number[] = [];
                      for (let i = 29; i >= 0; i--) {
                        const date = new Date(now);
                        date.setDate(now.getDate() - i);
                        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        dailyCounts.push(byDay.get(dateKey)?.length || 0);
                      }
                      // Downsample: take evenly spaced values
                      const step = dailyCounts.length / 24;
                      sparklineValues = Array.from({ length: 24 }, (_, i) => {
                        const idx = Math.floor(i * step);
                        return dailyCounts[idx] || 0;
                      });
                    } else if (scope === 'year') {
                      const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                      windowReflections = filterEventsByWindow(reflections, start, now);
                      const byDay = groupByDay(windowReflections);
                      totalEntries = windowReflections.length;
                      
                      // Get monthly counts (12 values)
                      const monthlyCounts: number[] = [];
                      for (let m = 11; m >= 0; m--) {
                        const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
                        const monthEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
                        let monthCount = 0;
                        for (const [dateKey, entries] of byDay.entries()) {
                          const date = new Date(dateKey);
                          if (date >= monthStart && date <= monthEnd) {
                            monthCount += entries.length;
                          }
                        }
                        monthlyCounts.push(monthCount);
                      }
                      sparklineValues = monthlyCounts;
                    }
                    
                    // Compute active days
                    const activeDaysSet = new Set<string>();
                    const byDayForActive = groupByDay(windowReflections);
                    for (const [dateKey, entries] of byDayForActive.entries()) {
                      if (entries.length > 0) {
                        activeDaysSet.add(dateKey);
                      }
                    }
                    const activeDays = activeDaysSet.size;
                    
                    // Compute distribution stats for spike ratio and top 10% share
                    const windowDays = scope === 'week' ? 7 : scope === 'month' ? 30 : 365;
                    const distributionResult = computeDistributionLayer(windowReflections, { windowDays });
                    const spikeRatio = distributionResult.stats.spikeRatio;
                    const top10SharePercent = distributionResult.stats.top10PercentDaysShare * 100;
                    
                    // Determine intensity (legacy string for display)
                    const intensity = totalEntries >= 50 ? 'High' : totalEntries >= 20 ? 'Medium' : 'Low';
                    
                    // Compute unified intensity levels
                    const entryIntensity = intensityFromEntryCount(totalEntries, scope);
                    const spikeIntensity = intensityFromSpikeRatio(spikeRatio);
                    const top10Intensity = intensityFromTop10Share(top10SharePercent);
                    
                    const scopeLabel = scope.charAt(0).toUpperCase() + scope.slice(1);
                    const confidenceLabel = cardWithMeta._confidence || 'medium';
                    const confidenceDisplay = confidenceLabel.charAt(0).toUpperCase() + confidenceLabel.slice(1);
                    
                    // Primary label based on scope
                    const primaryLabel = isPrimary
                      ? scope === 'week'
                        ? 'Primary structural pattern this week'
                        : scope === 'month'
                        ? 'Primary structural pattern this month'
                        : 'Primary structural pattern this year'
                      : undefined;
                    
                    // Icon based on scope
                    const icon = (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        {scope === 'week' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        ) : scope === 'month' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        )}
                      </svg>
                    );
                    
                    return (
                      <div key={card.id} className="summary-card-fade">
                        <InsightSignalCard
                          title={card.title}
                          icon={icon}
                          chips={[
                          { label: `Window: ${scopeLabel}` },
                          { label: `Intensity: ${intensity}`, intensity: entryIntensity },
                          { label: `Entries: ${totalEntries} ${interpretEntryCount(totalEntries, scope)}`, intensity: entryIntensity },
                          { label: `Active days: ${activeDays} ${interpretActiveDays(activeDays, windowDays)}` },
                          { label: `Spike ratio: ${spikeRatio.toFixed(1)}x ${interpretSpikeRatio(spikeRatio)}`, intensity: spikeIntensity },
                          { label: `Top 10% share: ${top10SharePercent.toFixed(0)}% ${interpretTop10Share(top10SharePercent)}`, intensity: top10Intensity },
                        ]}
                        rightMeta={`${totalEntries} entries`}
                        chart={<MiniHistogram values={sparklineValues} intensity={spikeIntensity} />}
                        primaryLabel={primaryLabel}
                        >
                          {card.explanation.split('.')[0]}.
                        </InsightSignalCard>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What this shows / does not show */}
            {summaryArtifactCards.length > 0 && (() => {
              const boundaries = getLensBoundaries('summary', narrativeTone);
              return (
                <div className="pt-6 mt-6">
                  <ObservationalDivider />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mt-6">
                    <div>
                      <div className="text-white/60 font-medium mb-2">What this shows</div>
                      <ul className="space-y-1 text-white/50 list-none">
                        {boundaries.shows.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-white/60 font-medium mb-2">What this does not show</div>
                      <ul className="space-y-1 text-white/50 list-none">
                        {boundaries.doesNotShow.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Session Closing */}
        <SessionClosing lens="summary" narrativeTone={narrativeTone} />
      </section>
    </div>
  );
}

