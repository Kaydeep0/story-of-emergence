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
import { getEventTimestampMs, isWithinRange, dateToMs } from '../../lib/insights/eventTimestampHelpers';
import type { ReflectionEntry } from '../../lib/insights/types';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import { InsightCardSkeleton } from '../components/InsightsSkeleton';
import { InsightPanel } from '../components/InsightPanel';
import { normalizeInsightCard } from '../../lib/insights/normalizeCard';
import { InsightSignalCard } from '../components/InsightSignalCard';
import { MiniHistogram } from '../components/MiniHistogram';
import { LensTransition } from '../components/LensTransition';
import { EvidenceChips } from '../components/EvidenceChips';
import { ReflectionPreviewPanel } from '../components/InsightDrawer';
import { filterEventsByWindow, groupByDay } from '../../lib/insights/timeWindows';
import { interpretSpikeRatio, interpretActiveDays, interpretEntryCount, interpretPeakDay } from '../lib/metricInterpretations';
import { compareToPreviousWeek, compareTo30DayAverage, formatComparisonIndicator, getPreviousPeriodDailyCounts } from '../lib/temporalComparisons';
import { intensityFromSpikeRatio, intensityFromEntryCount, type IntensityLevel } from '../lib/intensitySystem';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import Link from 'next/link';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';
import { useNarrativeTone } from '../hooks/useNarrativeTone';
import { NarrativeToneSelector } from '../components/NarrativeToneSelector';
import { getLensPurposeCopy, getLensBoundaries } from '../lib/lensPurposeCopy';
import { ObservationalDivider } from '../components/ObservationalDivider';
import { SessionClosing } from '../components/SessionClosing';
import { useDensity } from '../hooks/useDensity';
import { DensityToggle } from '../components/DensityToggle';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { buildSharePackForLens, type SharePack } from '../../lib/share/sharePack';
import { attachPersistenceToArtifact, clearArtifactCache } from '../../lib/observer/attachPersistence';
import '../styles/delights.css';

export default function WeeklyPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<InsightArtifact | null>(null);
  const { narrativeTone, handleToneChange } = useNarrativeTone(address, mounted);
  const { densityMode, handleDensityChange } = useDensity(address, mounted);
  const [selectedReflection, setSelectedReflection] = useState<ReflectionEntry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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

      // Filter events to weekly window using shared helpers (engine expects pre-filtered events)
      const startMs = dateToMs(start);
      const endMs = dateToMs(end);
      const events = eventsAll.filter((e) => {
        try {
          const eventMs = getEventTimestampMs(e);
          return isWithinRange(eventMs, startMs, endMs);
        } catch (err) {
          // Skip events with invalid timestamps
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Weekly] Skipping event with invalid timestamp:', e.id, err);
          }
          return false;
        }
      });

      // Compute weekly artifact with filtered events (even if events.length === 0 for debug info)
      const artifact = computeInsightsForWindow({
        horizon: 'weekly',
        events,
        windowStart: start,
        reflections, // Pass actual reflections so events can be matched to them
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
      // Map original cards to normalized cards for evidenceChips
      const cardsWithEvidence = normalizedCards.map((normalized, idx) => ({
        ...normalized,
        evidenceChips: cards[idx]?.evidenceChips,
      }));
      
      // Dev logging for debugging rendering issues
      if (process.env.NODE_ENV === 'development') {
        console.log('[Weekly] Artifact computed:', {
          eventsInWindow: events.length,
          cardsGenerated: cards.length,
          normalizedCards: normalizedCards.length,
          hasDebug: !!artifact.debug,
          debugRawCards: artifact.debug?.rawCardsGenerated,
          debugPassingCards: artifact.debug?.cardsPassingValidation,
        });
      }
      
      // Observer v1: Attach persistence by comparing with Yearly artifact if available
      // Clear cache at start to prevent stale artifacts from previous requests
      clearArtifactCache();
      
      // Attach persistence (may be null if Yearly artifact not in cache)
      const updatedArtifact = attachPersistenceToArtifact(artifact, reflections);
      
      // Store artifact for debug panel (always set, even if empty)
      setArtifact(updatedArtifact);
      
      return {
        weeklyCards: cardsWithEvidence,
        eventsInWindow: events.length,
      };
    } catch (err) {
      console.error('Failed to compute weekly insights:', err);
      return { weeklyCards: [], eventsInWindow: 0 };
    }
  }, [reflections, address]);

  // Build SharePack from weekly lens state
  const sharePack = useMemo<SharePack | null>(() => {
    if (reflections.length === 0 || !address || weeklyCards.length === 0) return null;

    try {
      // Get current week window
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const start = new Date(now);
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      // Filter reflections to week window
      const windowReflections = filterEventsByWindow(reflections, start, end);
      const byDay = groupByDay(windowReflections);
      
      // Compute metrics
      const entryCount = windowReflections.length;
      const activeDaysSet = new Set<string>();
      const dailyCounts: number[] = [];
      const keyMoments: Array<{ date: string }> = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const count = byDay.get(dateKey)?.length || 0;
        dailyCounts.push(count);
        
        if (count > 0) {
          activeDaysSet.add(dateKey);
          // Add as key moment if it's a spike day (≥3 entries)
          if (count >= 3) {
            keyMoments.push({ date: new Date(dateKey).toISOString() });
          }
        }
      }

      const activeDays = activeDaysSet.size;
      
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

      // Get one sentence summary from primary card
      const primaryCard = weeklyCards[0];
      const oneSentenceSummary = primaryCard?.headline || `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      // Determine distribution label (simplified - weekly typically shows normal or lognormal)
      const distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none' = 
        concentration > 0.4 ? 'powerlaw' :
        concentration > 0.2 ? 'lognormal' :
        'normal';

      return buildSharePackForLens({
        lens: 'weekly',
        oneSentenceSummary,
        entryCount,
        activeDays,
        distributionLabel,
        concentrationShareTop10PercentDays: concentration,
        spikeCount,
        keyMoments: keyMoments.slice(0, 3), // Top 3 spike days
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to build weekly SharePack:', err);
      return null;
    }
  }, [reflections, address, weeklyCards]);

  if (!mounted) return null;

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
        <div className="mb-6 pb-6">
          <ObservationalDivider />
          <p className="text-xs text-white/50 mb-1 mt-6">Why this lens exists</p>
          <p className="text-sm text-white/60 leading-relaxed">{getLensPurposeCopy('weekly', narrativeTone)}</p>
        </div>

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
                  Reflections exist this week, but no contract-compliant insights were generated.
                  {artifact?.debug?.rawCardsGenerated !== undefined && artifact.debug.rawCardsGenerated > 0 && (
                    <span className="block mt-2 text-xs text-white/40">
                      ({artifact.debug.rawCardsGenerated} card{artifact.debug.rawCardsGenerated === 1 ? '' : 's'} generated, {artifact.debug.cardsPassingValidation || 0} passed validation)
                    </span>
                  )}
                </p>
                <Link
                  href="/insights/summary"
                  className="inline-block px-4 py-2 text-sm text-white/80 hover:text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Back to Summary
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {weeklyCards.map((card, index) => {
                    const isPrimary = index === 0;
                    // Compute daily counts for last 7 days
                    const now = new Date();
                    const day = now.getDay();
                    const diffToMonday = (day + 6) % 7;
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - diffToMonday);
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(now);
                    weekEnd.setHours(23, 59, 59, 999);
                    
                    const windowReflections = filterEventsByWindow(reflections, weekStart, weekEnd);
                    const byDay = groupByDay(windowReflections);
                    
                    // Get daily counts for last 7 days
                    const dailyCounts: number[] = [];
                    const dates: string[] = [];
                    let peakDay = '';
                    let peakCount = 0;
                    const activeDaysSet = new Set<string>();
                    
                    for (let i = 6; i >= 0; i--) {
                      const date = new Date(now);
                      date.setDate(now.getDate() - i);
                      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      dates.push(dateKey);
                      const count = byDay.get(dateKey)?.length || 0;
                      dailyCounts.push(count);
                      
                      if (count > 0) {
                        activeDaysSet.add(dateKey);
                      }
                      if (count > peakCount) {
                        peakCount = count;
                        peakDay = dateKey;
                      }
                    }
                    
                    const weekCount = windowReflections.length;
                    const activeDays = activeDaysSet.size;
                    
                    // Compute spike ratio (peak day / average)
                    const avgDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
                    const spikeRatioValue = avgDaily > 0 ? peakCount / avgDaily : 0;
                    const spikeRatio = spikeRatioValue.toFixed(1);
                    
                    // Format peak day for display
                    const peakDayFormatted = peakDay ? new Date(peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                    
                    // Compute temporal comparisons
                    const weekComparison = compareToPreviousWeek(reflections, weekStart, weekEnd);
                    const comparisonText = weekComparison.previousWeekCount > 0 
                      ? formatComparisonIndicator(weekComparison.direction, weekComparison.changePercent, 'lastWeek')
                      : compareTo30DayAverage(reflections, weekStart, weekEnd).average30DayCount > 0
                      ? formatComparisonIndicator(
                          compareTo30DayAverage(reflections, weekStart, weekEnd).direction,
                          compareTo30DayAverage(reflections, weekStart, weekEnd).changePercent,
                          '30DayAverage'
                        )
                      : null;
                    
                    // Get ghost values for previous week
                    const ghostDailyCounts = getPreviousPeriodDailyCounts(reflections, weekStart, weekEnd, 'week');
                    
                    // Compute intensity levels
                    const entryIntensity = intensityFromEntryCount(weekCount, 'week');
                    const spikeIntensity = intensityFromSpikeRatio(spikeRatioValue);
                    
                    // Icon for weekly
                    const icon = (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    );
                    
                    return (
                      <InsightSignalCard
                        key={card.id || `weekly-${index}`}
                        title={card.headline}
                        subtitle={comparisonText ? `This week • ${comparisonText}` : 'This week'}
                        icon={icon}
                        chips={[
                          { label: `Reflections: ${weekCount} ${interpretEntryCount(weekCount, 'week')}`, intensity: entryIntensity },
                          { label: `Active days: ${activeDays} ${interpretActiveDays(activeDays, 7)}` },
                          { label: `Peak day: ${peakDayFormatted} ${interpretPeakDay(peakCount, avgDaily)}` },
                          { label: `Spike ratio: ${spikeRatio}x ${interpretSpikeRatio(spikeRatioValue)}`, intensity: spikeIntensity },
                        ]}
                        rightMeta={`${weekCount} entries`}
                        chart={<MiniHistogram values={dailyCounts} ghostValues={ghostDailyCounts.length === dailyCounts.length ? ghostDailyCounts : undefined} intensity={spikeIntensity} densityMode={densityMode} dates={dates} narrativeTone={narrativeTone} />}
                        primaryLabel={isPrimary ? 'Primary signal this week' : undefined}
                        densityMode={densityMode}
                      >
                        <div>
                          {card.summary.split('.')[0]}.
                          {card.evidenceChips && card.evidenceChips.length > 0 && (
                            <EvidenceChips
                              chips={card.evidenceChips}
                              reflections={reflections}
                              onChipClick={(reflection) => {
                                setSelectedReflection(reflection);
                                setPreviewOpen(true);
                              }}
                            />
                          )}
                        </div>
                      </InsightSignalCard>
                    );
                  })}
                </div>
                
                {/* Transition to boundaries */}
                {weeklyCards.length > 0 && (
                  <LensTransition text="Short bursts compound into longer-term structure." />
                )}
                
                {/* What this shows / does not show */}
                {weeklyCards.length > 0 && (() => {
                  const boundaries = getLensBoundaries('weekly', narrativeTone);
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
              </>
            )}
          </div>
        )}

        {/* Session Closing */}
        <SessionClosing lens="weekly" narrativeTone={narrativeTone} />
      </section>

      {/* Reflection Preview Panel */}
      <ReflectionPreviewPanel
        entry={selectedReflection}
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedReflection(null);
        }}
      />
    </div>
  );
}
