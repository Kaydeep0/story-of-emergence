'use client';

/**
 * Yearly Wrap v1 - Locked
 * 
 * This page provides a complete, stable view of a user's reflection patterns over the past year.
 * 
 * Scope: Single year analysis (365 days) using decrypted reflection entries.
 * Data source: Yearly Wrap only - no fallbacks, no lifetime data, no external sources.
 * 
 * Locked as v1: No new features, no expansion. This is a finished artifact.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import { computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from '../../lib/insights/distributionLayer';
import { getEventTimestampMs, isWithinRange, dateToMs } from '../../lib/insights/eventTimestampHelpers';
import type { ReflectionEntry, InsightCard } from '../../lib/insights/types';
import { rpcInsertEntry } from '../../lib/entries';
import { toast } from 'sonner';
import { extractKeywords, computeWordShift, getMoments, MeaningCard, Glossary } from './components/YearlyMeaning';
import { IdentityLine } from '../../components/yearly/IdentityLine';
import { YearShapeGlyph } from '../../components/yearly/YearShapeGlyph';
import { GrowthStory } from '../../components/yearly/GrowthStory';
import { ThreeMoments } from '../../components/yearly/ThreeMoments';
import { determineArchetype } from '../../lib/yearlyArchetype';
import { SharePackBuilder } from './components/SharePackBuilder';
import { UnderlyingRhythmCard } from './components/UnderlyingRhythmCard';
import { MirrorSection } from './components/MirrorSection';
import { buildEmergenceMap } from '../../lib/philosophy/emergenceMap';
import { EmergenceMapViz } from '../../components/philosophy/EmergenceMapViz';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import { buildMeaningCapsule } from '../../lib/share/meaningCapsule';
import { buildPublicSharePayload } from '../../lib/share/publicSharePayload';
import type { PublicSharePayload } from '../../lib/share/publicSharePayload';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';

// Yearly Wrap v1 - Locked
const YEARLY_WRAP_VERSION = 'v1' as const;

export default function YearlyWrapPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [windowDistribution, setWindowDistribution] = useState<WindowDistribution | null>(null);
  const [identitySentence, setIdentitySentence] = useState<string>('');
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [privateMode, setPrivateMode] = useState(true);
  const [insightArtifact, setInsightArtifact] = useState<InsightArtifact | null>(null);

  // Removed yearlyArtifact state - sharing is handled by SharePackBuilder

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

  // Compute yearly distribution via canonical engine
  useEffect(() => {
    if (reflections.length === 0 || !address) {
      setDistributionResult(null);
      setWindowDistribution(null);
      return;
    }

    try {
      // Convert reflections to UnifiedInternalEvent format (same pattern as Weekly/Summary/Timeline)
      // Source of truth: ReflectionEntry.createdAt (ISO string) -> eventAt (ISO string)
      const walletAlias = address.toLowerCase();
      const eventsAll = reflections.map((r) => ({
        id: r.id ?? crypto.randomUUID(),
        walletAlias,
        eventAt: new Date(r.createdAt).toISOString(), // Same timestamp pipeline as Weekly/Timeline
        eventKind: 'written' as const,
        sourceKind: 'journal' as const,
        plaintext: r.plaintext ?? '',
        length: (r.plaintext ?? '').length,
        sourceId: r.sourceId ?? null,
        topics: [],
      }));

      // Determine window: last 365 days with day boundaries (unified with Weekly)
      // Use startOfDay and endOfDay to ensure reflections don't fall outside window due to time math
      const now = new Date();
      const windowEnd = new Date(now);
      windowEnd.setHours(23, 59, 59, 999); // End of today
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - 365);
      windowStart.setHours(0, 0, 0, 0); // Start of day 365 days ago

      // Filter events to window using shared helpers (same as Weekly)
      const windowStartMs = dateToMs(windowStart);
      const windowEndMs = dateToMs(windowEnd);
      const events = eventsAll.filter((e) => {
        try {
          const eventMs = getEventTimestampMs(e);
          return isWithinRange(eventMs, windowStartMs, windowEndMs);
        } catch (err) {
          // Skip events with invalid timestamps
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Yearly] Skipping event with invalid timestamp:', e.id, err);
          }
          return false;
        }
      });

      // Dev-only logging: verify filtering
      if (process.env.NODE_ENV === 'development') {
        console.log('[Yearly] Event filtering:', {
          eventsAllCount: eventsAll.length,
          eventsInWindowCount: events.length,
          windowStartIso: windowStart.toISOString(),
          windowEndIso: windowEnd.toISOString(),
          windowStartMs,
          windowEndMs,
        });
      }

      // Compute yearly artifact via canonical engine with filtered events
      // Pass reflections as fallback in case eventsToReflectionEntries fails
      const artifact = computeInsightsForWindow({
        horizon: 'yearly',
        events,
        windowStart,
        windowEnd,
        wallet: address ?? undefined,
        entriesCount: reflections.length,
        eventsCount: events.length,
        reflectionsLoaded: reflections.length,
        eventsGenerated: eventsAll.length, // Total events generated before filtering
        reflections: reflections.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          plaintext: r.plaintext ?? '',
        })),
      } as any);

      // Store artifact for debug panel
      setInsightArtifact(artifact);

      // Extract DistributionResult and WindowDistribution from artifact card metadata
      const cards = artifact.cards ?? [];
      
      // Dev log: Card kinds before search (same pattern as Distributions)
      if (process.env.NODE_ENV === 'development') {
        const allCardKinds = cards.map(c => c.kind);
        console.log('[Yearly Wrap] Card extraction - before search:', {
          cardsLength: cards.length,
          allCardKinds,
        });
      }
      
      // Search for card with kind 'distribution' (matches computeYearlyArtifact)
      const yearlyCard = cards.find((c) => c.kind === 'distribution');
      
      // Dev-only logging: verify extraction and card shape
      if (process.env.NODE_ENV === 'development') {
        // Log the full card object to see its shape (safe in dev)
        if (yearlyCard) {
          console.log('[Yearly Wrap] Full card object:', {
            id: yearlyCard.id,
            kind: yearlyCard.kind,
            title: yearlyCard.title,
            explanation: yearlyCard.explanation,
            evidenceCount: yearlyCard.evidence?.length ?? 0,
            computedAt: yearlyCard.computedAt,
            allKeys: Object.keys(yearlyCard),
            hasDistributionResult: '_distributionResult' in yearlyCard,
            hasWindowDistribution: '_windowDistribution' in yearlyCard,
            distributionResultType: typeof (yearlyCard as any)._distributionResult,
            windowDistributionType: typeof (yearlyCard as any)._windowDistribution,
            distributionResultTotalEntries: (yearlyCard as any)._distributionResult?.totalEntries,
            windowDistributionClassification: (yearlyCard as any)._windowDistribution?.classification,
          });
        }
        
        const allCardKinds = cards.map(c => c.kind);
        console.log('[Yearly Wrap] Artifact extraction debug:', {
          cardsLength: cards.length,
          allCardKinds, // Log all kinds to see what's actually in the artifact
          searchingForKind: 'distribution',
          yearlyCardExists: !!yearlyCard,
          yearlyCardKind: yearlyCard?.kind,
          hasDistributionResult: !!(yearlyCard as any)?._distributionResult,
          hasWindowDistribution: !!(yearlyCard as any)?._windowDistribution,
          eventCount: events.length,
          eventsInWindow: events.filter(e => {
            const eventDate = new Date(e.eventAt);
            return eventDate >= windowStart && eventDate <= windowEnd;
          }).length,
        });
      }
      
      // Extract distribution objects from card metadata
      // Yearly uses the same compute path as Distributions, so distributions are always created
      // If card exists, metadata should always be present (card is only created if distributions exist)
      if (yearlyCard) {
        const cardMeta = yearlyCard as any;
        if (cardMeta._distributionResult && cardMeta._windowDistribution) {
          const distributionResult = cardMeta._distributionResult as DistributionResult;
          const windowDistribution = cardMeta._windowDistribution as WindowDistribution;
          setDistributionResult(distributionResult);
          setWindowDistribution(windowDistribution);
        } else {
          // Card exists but metadata missing - this shouldn't happen but handle gracefully
          if (process.env.NODE_ENV === 'development') {
            console.error('[Yearly Wrap] Card exists but metadata missing:', {
              cardId: yearlyCard.id,
              cardKeys: Object.keys(yearlyCard),
              hasDistributionResult: '_distributionResult' in cardMeta,
              hasWindowDistribution: '_windowDistribution' in cardMeta,
            });
          }
          setDistributionResult(null);
          setWindowDistribution(null);
        }
      } else {
        // Card doesn't exist - distributions weren't computed (likely totalEntries === 0)
        setDistributionResult(null);
        setWindowDistribution(null);
      }
    } catch (err) {
      console.error('Failed to compute yearly insights:', err);
      setDistributionResult(null);
      setWindowDistribution(null);
    }
  }, [reflections, address]);

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

  // Compute Mirror insights (keywords, word shift, moments)
  const mirrorInsights = useMemo(() => {
    if (reflections.length === 0 || !distributionResult) {
      return null;
    }

    const keywords = extractKeywords(reflections, 14);
    const wordShift = computeWordShift(reflections);
    const topSpikeDates = getTopSpikeDates(distributionResult, 3);
    const moments = getMoments(reflections, topSpikeDates);

    return {
      keywords,
      wordShift,
      moments,
    };
  }, [reflections, distributionResult]);

  // Compute most common day count - FIX CRASH: compute before any use
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

  // Compute archetype
  const archetype = useMemo(() => {
    if (!distributionResult || !windowDistribution) return null;
    return determineArchetype({
      classification: windowDistribution.classification,
      spikeRatio: distributionResult.stats.spikeRatio,
      top10Share: distributionResult.stats.top10PercentDaysShare,
      activeDays: computeActiveDays(distributionResult.dailyCounts),
      variance: distributionResult.stats.variance,
    });
  }, [distributionResult, windowDistribution]);

  // Get top spike date
  const topSpikeDate = useMemo(() => {
    if (!distributionResult || distributionResult.topDays.length === 0) return undefined;
    return distributionResult.topDays[0]?.date;
  }, [distributionResult]);

  // Compute spikeCount for EmergenceMap (observer layer computation)
  const spikeCount = useMemo(() => {
    if (!distributionResult || !distributionResult.dailyCounts || distributionResult.dailyCounts.length === 0) {
      return 0;
    }
    
    const dailyCounts = distributionResult.dailyCounts;
    const nonZeroCounts = dailyCounts.filter(c => c > 0);
    
    if (nonZeroCounts.length === 0) {
      return 0;
    }
    
    // Compute median
    const sortedNonZero = [...nonZeroCounts].sort((a, b) => a - b);
    const median = sortedNonZero.length % 2 === 0
      ? (sortedNonZero[sortedNonZero.length / 2 - 1] + sortedNonZero[sortedNonZero.length / 2]) / 2
      : sortedNonZero[Math.floor(sortedNonZero.length / 2)];
    
    const effectiveMedian = median > 0 ? median : 1;
    const spikeThreshold = Math.max(3, effectiveMedian * 2);
    
    // Count spike days: ≥3 entries AND ≥2× median
    return dailyCounts.filter(count => count >= spikeThreshold && count >= 3).length;
  }, [distributionResult]);

  // Build EmergenceMap from existing insight data
  const emergenceMap = useMemo(() => {
    if (!distributionResult || !windowDistribution) return null;
    
    // Map windowDistribution.classification to EmergenceMapInput format
    const distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none' = 
      windowDistribution.classification === 'normal' ? 'normal'
      : windowDistribution.classification === 'lognormal' ? 'lognormal'
      : windowDistribution.classification === 'powerlaw' ? 'powerlaw'
      : 'mixed';
    
    return buildEmergenceMap({
      distributionLabel,
      concentration: distributionResult.stats.top10PercentDaysShare,
      spikeCount,
    });
  }, [distributionResult, windowDistribution, spikeCount]);

  // Build PublicSharePayload for public share link
  const publicSharePayload = useMemo<PublicSharePayload | null>(() => {
    if (!identitySentence || !emergenceMap) return null;
    
    try {
      // Build MeaningCapsule from yearly insights
      const capsule = buildMeaningCapsule({
        insightSentence: identitySentence,
        horizon: 'yearly',
        emergenceMap: {
          regime: emergenceMap.regime,
          position: emergenceMap.position,
        },
      });
      
      // Build PublicSharePayload
      return buildPublicSharePayload(capsule, {
        shareFormat: 'image',
        contextHint: 'observational',
        origin: 'yearly',
      });
    } catch (error) {
      console.error('Failed to build public share payload:', error);
      return null;
    }
  }, [identitySentence, emergenceMap]);

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
          mostCommonDayCount: mostCommonDayCount ?? 0,
          variance: distributionResult.stats.variance,
          spikeRatio: distributionResult.stats.spikeRatio,
          top10PercentDaysShare: distributionResult.stats.top10PercentDaysShare,
          narrative: narrativeInsight.explanation,
        },
        ts: Date.now(),
      };

      await rpcInsertEntry(address, sessionKey, highlightPayload);
      toast.success('Saved');
    } catch (err: any) {
      console.error('Failed to save highlight', err);
      toast.error(err?.message ?? 'Failed to save highlight');
    }
  };

  if (!mounted) return null;

  // Show wallet/encryption messaging if not ready
  if (!connected) {
    return (
      <div>
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">Connect your wallet to view your yearly wrap.</p>
          </div>
        </section>
      </div>
    );
  }

  if (!encryptionReady) {
    return (
      <div>
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">
              {encryptionError || 'Encryption key not ready. Please sign the consent message.'}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-10">
        <InsightDebugPanel debug={insightArtifact?.debug} />

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

        {/* Empty State - Only show if no data loaded/generated */}
        {!loading && !error && (() => {
          const debug = insightArtifact?.debug;
          const reflectionsLoaded = debug?.reflectionsLoaded ?? 0;
          const eventsGenerated = debug?.eventsGenerated ?? 0;
          const eventCount = debug?.eventCount ?? 0;
          
          // Dev-only logging: gate values
          if (process.env.NODE_ENV === 'development') {
            console.log('[Yearly Wrap] Empty state gate:', {
              reflectionsLoaded,
              eventsGenerated,
              eventCount,
              shouldShowEmpty: reflectionsLoaded === 0 || eventsGenerated === 0 || eventCount === 0,
            });
          }
          
          // Show empty state ONLY if no data at all (do not block on artifact shape)
          return reflectionsLoaded === 0 || eventsGenerated === 0 || eventCount === 0;
        })() && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">No reflections found in the last 365 days. Start writing to see your yearly wrap.</p>
          </div>
        )}

        {/* Yearly wrap still forming - Data exists but artifact incomplete */}
        {!loading && !error && (() => {
          const debug = insightArtifact?.debug;
          const eventCount = debug?.eventCount ?? 0;
          const cards = insightArtifact?.cards ?? [];
          const yearlyCard = cards.find((c) => c.kind === 'distribution');
          const hasYearlyCard = !!yearlyCard;
          
          // Dev-only logging: gate values
          if (process.env.NODE_ENV === 'development') {
            console.log('[Yearly Wrap] Still forming gate:', {
              eventCount,
              cardsLength: cards.length,
              yearlyCardExists: hasYearlyCard,
              yearlyCardKind: yearlyCard?.kind,
              shouldShowStillForming: eventCount > 0 && !hasYearlyCard,
            });
          }
          
          // Show this state ONLY if eventCount > 0 but yearly card doesn't exist
          // This means distribution computation failed
          return eventCount > 0 && !hasYearlyCard;
        })() && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <p className="text-white/70 mb-2">Yearly wrap is still forming. Data is present.</p>
            <p className="text-sm text-white/50">See debug panel above for details.</p>
          </div>
        )}

        {/* Yearly Wrap Content - Organized for clarity and completeness */}
        {!loading && !error && (() => {
          const debug = insightArtifact?.debug;
          const eventCount = debug?.eventCount ?? 0;
          const cards = insightArtifact?.cards ?? [];
          const yearlyCard = cards.find((c) => c.kind === 'distribution');
          const hasYearlyCard = !!yearlyCard;
          
          // Dev-only logging: gate values
          if (process.env.NODE_ENV === 'development') {
            console.log('[Yearly Wrap] Content render gate:', {
              eventCount,
              cardsLength: cards.length,
              yearlyCardExists: hasYearlyCard,
              yearlyCardKind: yearlyCard?.kind,
              // Render if card exists - distribution objects are used but not required for gate
              shouldRenderContent: eventCount > 0 && hasYearlyCard,
            });
          }
          
          // Gate on card existence only: if card exists, render (even if distributions are missing)
          // UI components handle missing distributions gracefully with null checks
          return eventCount > 0 && hasYearlyCard;
        })() && (
          <div className="space-y-8">
            {/* Header: Year and context */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-semibold text-center">Yearly Wrap</h1>
              <p className="text-sm text-white/60 text-center italic max-w-2xl mx-auto">
                A reflection of how this year concentrated your attention, effort, and emotion.
              </p>
            </div>

            {/* 1️⃣ IDENTITY: One-sentence summary with year */}
            {distributionResult && windowDistribution && (
              <IdentityLine
                totalEntries={distributionResult.totalEntries}
                activeDays={computeActiveDays(distributionResult.dailyCounts)}
                spikeRatio={distributionResult.stats.spikeRatio}
                top10PercentShare={distributionResult.stats.top10PercentDaysShare}
                classification={windowDistribution.classification}
                onSentenceChange={setIdentitySentence}
              />
            )}

            {/* Share Actions Bar - Public share link */}
            {publicSharePayload && (
              <ShareActionsBar
                artifact={null}
                senderWallet={address}
                encryptionReady={encryptionReady}
                publicSharePayload={publicSharePayload}
              />
            )}

            {/* Archetype - Prominently displayed if present */}
            {archetype && (
              <div className="rounded-2xl border border-white/15 bg-white/8 p-6 sm:p-8">
                <div className="text-xs text-white/50 mb-2 uppercase tracking-wide">Your Archetype</div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-2">{archetype.name}</h2>
                <p className="text-sm sm:text-base text-white/70 leading-relaxed italic mb-2">{archetype.tagline}</p>
                <p className="text-sm sm:text-base text-white/70 leading-relaxed">{archetype.explanation}</p>
              </div>
            )}

            {/* Emergence Map Visualization - Determinism → Emergence spectrum */}
            {emergenceMap && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
                <div className="text-xs text-white/50 mb-4 uppercase tracking-wide">Your Position</div>
                <EmergenceMapViz map={emergenceMap} />
                <p className="text-xs text-white/50 mt-4 text-center">
                  Your activity moves along a spectrum from routine patterns to emergent concentration over time.
                </p>
                
                {/* Emergence Interpretation Panel - Philosophy-aligned orientation */}
                <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                  <div>
                    <h4 className="text-xs text-white/60 mb-1.5 font-medium">What this shows</h4>
                    <p className="text-xs text-white/50 leading-relaxed">
                      This map reflects how your reflection patterns have distributed themselves over time, from consistent routines to concentrated moments of intensity.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-white/60 mb-1.5 font-medium">How to read it</h4>
                    <p className="text-xs text-white/50 leading-relaxed">
                      The position marker indicates where your activity sits on a spectrum between predictable patterns and emergent concentration. The four zones represent different organizational structures.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-white/60 mb-1.5 font-medium">What it is not</h4>
                    <p className="text-xs text-white/50 leading-relaxed">
                      This is not a score, a goal, or a recommendation. It is an observation of how your attention has moved, not an instruction for how it should move.
                    </p>
                  </div>
                </div>
                
                {/* Continuity Anchor - Acknowledges time passing without concluding */}
                <p className="text-xs text-white/40 mt-6 pt-4 text-center italic border-t border-white/5">
                  These patterns continue to unfold as time passes.
                </p>
              </div>
            )}

            {/* 2️⃣ DISTRIBUTION: Pattern label and key numbers */}
            {distributionResult && windowDistribution && (
              <UnderlyingRhythmCard
                distributionResult={distributionResult}
                windowDistribution={windowDistribution}
                mostCommonDayCount={mostCommonDayCount}
                formatClassification={formatClassification}
              />
            )}

            {/* 3️⃣ BEHAVIOR: Visual representation of your year */}
            {distributionResult && distributionResult.dailyCounts.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                <p className="text-sm text-white/70 mb-4 italic">This is how your attention actually moved.</p>
                <YearShapeGlyph
                  dailyCounts={distributionResult.dailyCounts}
                  topSpikeDates={getTopSpikeDates(distributionResult, 3)}
                  mode="page"
                />
              </div>
            )}

            {/* 4️⃣ KEY MOMENTS: Three moments that shaped your year */}
            <ThreeMoments
              entries={reflections}
              topSpikeDate={topSpikeDate}
              formatDate={formatDate}
            />

            {/* 5️⃣ MIRROR INSIGHT: Recurring themes and reflection */}
            <MirrorSection
              mirrorInsights={mirrorInsights}
              formatDate={formatDate}
              entries={reflections}
              topSpikeDates={distributionResult ? getTopSpikeDates(distributionResult, 3) : []}
            />

            {/* Mirror Insight - Narrative reflection */}
            {narrativeInsight && (
              <div className="rounded-2xl border border-white/15 bg-white/8 p-6 sm:p-8">
                <h3 className="text-lg font-semibold mb-3">A year, observed</h3>
                <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-4">
                  {narrativeInsight.explanation}
                </p>
                <p className="text-xs text-white/50 italic">
                  This wasn&apos;t a highlight reel. It was a record of attention, taken as it actually moved. Nothing here was optimized—only noticed.
                </p>
              </div>
            )}

            {/* Why this mattered - Emotional hinge */}
            <div className="rounded-2xl border border-white/15 bg-white/8 p-6 sm:p-8">
              <h3 className="text-lg font-semibold mb-3">Why this mattered</h3>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                You didn&apos;t spread your attention thin. You let quiet stretches do their work, then arrived fully when something was ready to move. This rhythm favors depth over noise—and it compounds more than it appears.
              </p>
            </div>

            {/* Share Pack Builder - Create shareable artifact */}
            <SharePackBuilder
              year={new Date().getFullYear()}
              identitySentence={identitySentence || 'My year in reflection.'}
              archetype={archetype?.name}
              yearShape={
                distributionResult && distributionResult.dailyCounts.length > 0
                  ? {
                      dailyCounts: distributionResult.dailyCounts,
                      topSpikeDates: getTopSpikeDates(distributionResult, 3),
                    }
                  : undefined
              }
              moments={mirrorInsights?.moments.map(m => ({
                date: m.date,
                preview: m.preview,
              }))}
              numbers={
                distributionResult
                  ? {
                      totalEntries: distributionResult.totalEntries,
                      activeDays: computeActiveDays(distributionResult.dailyCounts),
                      spikeRatio: distributionResult.stats.spikeRatio,
                    }
                  : undefined
              }
              mirrorInsight={narrativeInsight?.explanation}
              entries={reflections}
              distributionResult={distributionResult ?? undefined}
              windowDistribution={windowDistribution ?? undefined}
              encryptionReady={encryptionReady}
            />

            {/* Growth Story - Additional context */}
            {reflections.length >= 10 && <GrowthStory entries={reflections} />}

            {/* Footer note */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-xs text-white/40 text-center">
                Yearly Wrap · Private · Computed Locally
              </p>
            </div>
          </div>
        )}

      </section>
  );
}
