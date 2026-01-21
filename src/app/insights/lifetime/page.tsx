'use client';

/**
 * Lifetime Insights v1
 * 
 * Shows lifetime distribution metrics across all reflections.
 * Uses the same distribution layer pipeline as Weekly, Distributions, and YoY.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry } from '../../lib/insights/timelineSpikes';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import { computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from '../../lib/insights/distributionLayer';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';
import type { ReflectionEntry } from '../../lib/insights/types';
import { useNarrativeTone } from '../hooks/useNarrativeTone';
import { NarrativeToneSelector } from '../components/NarrativeToneSelector';
import { useDensity } from '../hooks/useDensity';
import { DensityToggle } from '../components/DensityToggle';
import { getCardPadding, getSectionSpacing, getTextSize, getGridGap } from '../lib/densityStyles';
import { useParallax } from '../hooks/useParallax';
import { getLensPurposeCopy } from '../lib/lensPurposeCopy';
import { LensTransition } from '../components/LensTransition';
import { interpretSpikeRatio, interpretTop10Share, interpretActiveDays, interpretEntryCount } from '../lib/metricInterpretations';
import { ObservationalDivider } from '../components/ObservationalDivider';
import { SessionClosing } from '../components/SessionClosing';
import { buildSharePackForLens, type SharePack } from '../../lib/share/sharePack';
import { filterEventsByWindow } from '../../lib/insights/timeWindows';
import '../styles/delights.css';

import type { NarrativeTone } from '../hooks/useNarrativeTone';

interface ToneCopy {
  primaryInsight: string;
  patternNarrative: {
    paragraph1: string;
    paragraph2: string;
  };
  activeDaysMicro: string;
  spikeRatioMicro: string;
  spikeRatioExplanation: (ratio: number) => string;
  top10ShareMicro: string;
  top10ShareExplanation: (share: number) => string;
  distributionPatternMicro: (classification: string) => string;
  distributionPatternExplanation: (classification: string) => string;
  mostIntenseDay: string;
  distributionViewText: {
    line1: string;
    line2: string;
  };
  closingLine: string;
}

const TONE_COPY: Record<NarrativeTone, ToneCopy> = {
  calm: {
    primaryInsight: 'Your thinking concentrates into a small number of high-intensity days.',
    patternNarrative: {
      paragraph1: 'Across your lifetime, your thinking does not distribute evenly. Instead, it gathers quietly and releases in concentrated bursts. Long stretches of lower activity are punctuated by days where attention, processing, or emotional energy converges into a short window.',
      paragraph2: 'This pattern suggests a mind that accumulates insight internally and externalizes it when something reaches significance. Rather than maintaining steady daily output, your reflections cluster around moments that matter, creating a small number of high-intensity days that carry a disproportionate share of your thinking.',
    },
    activeDaysMicro: 'Your writing concentrates into fewer days rather than spreading evenly over time.',
    spikeRatioMicro: 'When you write, intensity tends to scale sharply rather than incrementally.',
    spikeRatioExplanation: (ratio) => `On your most active days, you write about ${Math.round(ratio)} times more than on an average day.`,
    top10ShareMicro: 'A small number of sessions carry a large share of your total output.',
    top10ShareExplanation: (share) => share >= 40 
      ? 'Nearly half of your total writing happened on just a few days.'
      : 'A portion of your writing concentrated on your most active days.',
    distributionPatternMicro: (classification) => {
      if (classification === 'lognormal') {
        return 'Most days are quiet. A few days carry unusually high cognitive load.';
      } else if (classification === 'powerlaw') {
        return 'Extreme concentration—most activity happens on a very small number of days.';
      }
      return 'Relatively even distribution of activity over time.';
    },
    distributionPatternExplanation: (classification) => {
      if (classification === 'lognormal') {
        return 'A log-normal pattern means most days are quiet, while a few days carry very high intensity. This is common in creative, analytical, and emotionally driven thinking, where insight arrives unevenly.';
      } else if (classification === 'powerlaw') {
        return 'A power law pattern shows extreme concentration—most activity happens on a very small number of days. This suggests thinking arrives in rare but intense clusters.';
      }
      return 'A normal pattern shows relatively even distribution of activity over time. Your reflections spread consistently across your active days.';
    },
    mostIntenseDay: 'This day represents a peak cognitive event. Something pulled a large amount of attention, processing, or emotional energy into a single window.',
    distributionViewText: {
      line1: 'Most days fall near the lower end of intensity.',
      line2: 'A small number of days extend far to the right, carrying unusually high cognitive load.',
    },
    closingLine: 'Over long horizons, your thinking reveals itself through bursts rather than continuity.',
  },
  poetic: {
    primaryInsight: 'Your thinking gathers in quiet pools, then breaks into concentrated waves.',
    patternNarrative: {
      paragraph1: 'Your reflections do not flow evenly across time. They accumulate in silence, then surface in sudden clusters. Long stretches of stillness give way to days where thought converges, where attention narrows and deepens.',
      paragraph2: 'This rhythm suggests a mind that holds insight close until it reaches a threshold, then releases it in concentrated form. Your writing does not maintain steady pace, but clusters around moments of significance, creating islands of intensity that carry the weight of your thinking.',
    },
    activeDaysMicro: 'Your words gather into concentrated days rather than spreading thin across time.',
    spikeRatioMicro: 'When you write, intensity rises in sudden leaps rather than gradual steps.',
    spikeRatioExplanation: (ratio) => `Your most active days hold ${Math.round(ratio)} times the intensity of an average day.`,
    top10ShareMicro: 'A handful of sessions hold the majority of your output.',
    top10ShareExplanation: (share) => share >= 40 
      ? 'Nearly half of all your writing emerged from just a few days.'
      : 'A substantial portion of your writing gathered into your most active days.',
    distributionPatternMicro: (classification) => {
      if (classification === 'lognormal') {
        return 'Most days rest quietly, while a few days rise to unusual heights.';
      } else if (classification === 'powerlaw') {
        return 'Extreme concentration—most activity gathers into a very small number of days.';
      }
      return 'Relatively even flow of activity over time.';
    },
    distributionPatternExplanation: (classification) => {
      if (classification === 'lognormal') {
        return 'A log-normal pattern: most days rest quietly, while a few days rise to unusual heights. This rhythm appears often in creative and analytical thinking, where insight arrives in uneven waves.';
      } else if (classification === 'powerlaw') {
        return 'A power law pattern shows extreme concentration—most activity gathers into a very small number of days. Thinking arrives in rare but powerful surges.';
      }
      return 'A normal pattern shows relatively even flow of activity over time. Your reflections spread consistently across your active days.';
    },
    mostIntenseDay: 'This day marks a peak moment. Something drew a large amount of attention, processing, or feeling into a single window.',
    distributionViewText: {
      line1: 'Most days rest near the lower end of intensity.',
      line2: 'A few days stretch far to the right, carrying unusually heavy cognitive weight.',
    },
    closingLine: 'Over long horizons, your thinking reveals itself through bursts rather than steady flow.',
  },
  analytical: {
    primaryInsight: 'Your thinking exhibits concentration bias: a small number of high-intensity days account for disproportionate output.',
    patternNarrative: {
      paragraph1: 'Your reflection distribution is non-uniform. Activity clusters into discrete high-intensity events separated by periods of lower output. Long intervals of minimal activity are interrupted by days where cognitive load, attention allocation, and processing converge into compressed time windows.',
      paragraph2: 'This distribution pattern indicates a system that accumulates internal state and externalizes it when thresholds are reached. Rather than maintaining constant output rate, your reflections cluster around notable events, creating a small number of high-intensity days that account for a disproportionate share of total output.',
    },
    activeDaysMicro: 'Output concentrates into fewer active days rather than distributing uniformly across time.',
    spikeRatioMicro: 'Output intensity scales non-linearly, with sharp increases rather than incremental growth.',
    spikeRatioExplanation: (ratio) => `Peak output days exhibit ${Math.round(ratio)}x intensity relative to mean daily output.`,
    top10ShareMicro: 'A small subset of sessions accounts for a large proportion of total output.',
    top10ShareExplanation: (share) => share >= 40 
      ? 'Approximately half of total output occurred during a small number of days.'
      : 'A proportion of output concentrated into the most active days.',
    distributionPatternMicro: (classification) => {
      if (classification === 'lognormal') {
        return 'Most days exhibit low intensity, while a small number show very high intensity.';
      } else if (classification === 'powerlaw') {
        return 'Extreme concentration—most activity occurs during a very small number of days.';
      }
      return 'Relatively uniform activity distribution over time.';
    },
    distributionPatternExplanation: (classification) => {
      if (classification === 'lognormal') {
        return 'Log-normal distribution: most days exhibit low intensity, while a small number of days show very high intensity. This pattern is common in creative, analytical, and emotionally driven cognitive processes where insight generation is non-uniform.';
      } else if (classification === 'powerlaw') {
        return 'Power law distribution indicates extreme concentration—most activity occurs during a very small number of days. This suggests thinking arrives in rare but high-intensity clusters.';
      }
      return 'Normal distribution indicates relatively uniform activity distribution over time. Output spreads consistently across active days.';
    },
    mostIntenseDay: 'This day represents a peak cognitive event. A large amount of attention, processing, or emotional energy was allocated to a single time window.',
    distributionViewText: {
      line1: 'Most days cluster near the lower end of the intensity distribution.',
      line2: 'A small number of days extend far to the right, exhibiting unusually high cognitive load.',
    },
    closingLine: 'Over long time horizons, your thinking exhibits burst-like patterns rather than continuous output.',
  },
  mirror: {
    primaryInsight: 'You concentrate your thinking into a small number of high-intensity days.',
    patternNarrative: {
      paragraph1: 'You do not distribute your thinking evenly across time. Instead, you gather it quietly and release it in concentrated bursts. Long stretches of lower activity are punctuated by days where your attention, processing, or emotional energy converges into a short window.',
      paragraph2: 'This pattern suggests you accumulate insight internally and externalize it when something reaches significance. Rather than maintaining steady daily output, you cluster your reflections around moments that matter, creating a small number of high-intensity days that carry a disproportionate share of your thinking.',
    },
    activeDaysMicro: 'You concentrate your writing into fewer days rather than spreading it evenly over time.',
    spikeRatioMicro: 'When you write, your intensity scales sharply rather than incrementally.',
    spikeRatioExplanation: (ratio) => `On your most active days, you write about ${Math.round(ratio)} times more than on an average day.`,
    top10ShareMicro: 'A small number of your sessions carry a large share of your total output.',
    top10ShareExplanation: (share) => share >= 40 
      ? 'Nearly half of your total writing happened on just a few days.'
      : 'A portion of your writing concentrated on your most active days.',
    distributionPatternMicro: (classification) => {
      if (classification === 'lognormal') {
        return 'Most of your days are quiet, while a few days carry unusually high cognitive load.';
      } else if (classification === 'powerlaw') {
        return 'Extreme concentration—most of your activity happens on a very small number of days.';
      }
      return 'Relatively even distribution of your activity over time.';
    },
    distributionPatternExplanation: (classification) => {
      if (classification === 'lognormal') {
        return 'A log-normal pattern means most of your days are quiet, while a few days carry very high intensity. This is common in creative, analytical, and emotionally driven thinking, where your insight arrives unevenly.';
      } else if (classification === 'powerlaw') {
        return 'A power law pattern shows extreme concentration—most of your activity happens on a very small number of days. Your thinking arrives in rare but intense clusters.';
      }
      return 'A normal pattern shows relatively even distribution of your activity over time. Your reflections spread consistently across your active days.';
    },
    mostIntenseDay: 'This day represents a peak cognitive event for you. Something pulled a large amount of your attention, processing, or emotional energy into a single window.',
    distributionViewText: {
      line1: 'Most of your days fall near the lower end of intensity.',
      line2: 'A small number of your days extend far to the right, carrying unusually high cognitive load.',
    },
    closingLine: 'Over long horizons, your thinking reveals itself through bursts rather than continuity.',
  },
};

/**
 * Distribution Visualization Component
 * Renders a simple histogram with log-normal curve overlay
 */
function DistributionVisualization({ 
  dailyCounts, 
  top10PercentThreshold 
}: { 
  dailyCounts: number[]; 
  top10PercentThreshold: number;
}) {
  // Calculate histogram bins
  const maxCount = Math.max(...dailyCounts);
  const minCount = Math.min(...dailyCounts);
  const binCount = Math.min(20, maxCount - minCount + 1);
  const binSize = (maxCount - minCount) / binCount || 1;
  
  // Create histogram
  const histogram: number[] = new Array(binCount).fill(0);
  const sortedCounts = [...dailyCounts].sort((a, b) => a - b);
  const top10Threshold = sortedCounts[Math.max(0, sortedCounts.length - top10PercentThreshold)] || maxCount;
  
  dailyCounts.forEach(count => {
    const binIndex = Math.min(Math.floor((count - minCount) / binSize), binCount - 1);
    if (binIndex >= 0) {
      histogram[binIndex]++;
    }
  });
  
  const maxFrequency = Math.max(...histogram, 1);
  
  // SVG dimensions
  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate log-normal curve parameters from actual data
  const logValues = dailyCounts.filter(c => c > 0).map(c => Math.log(c));
  const logMean = logValues.reduce((a, b) => a + b, 0) / logValues.length;
  const logVariance = logValues.reduce((sum, val) => sum + Math.pow(val - logMean, 2), 0) / logValues.length;
  const logStdDev = Math.sqrt(logVariance);
  
  // Generate smooth log-normal curve points
  const curvePoints: Array<{ x: number; y: number }> = [];
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    const intensity = minCount + (i / steps) * (maxCount - minCount);
    if (intensity > 0) {
      const logIntensity = Math.log(intensity);
      // Log-normal PDF: f(x) = (1/(x*σ*√(2π))) * exp(-0.5*((ln(x)-μ)/σ)²)
      const pdf = Math.exp(-0.5 * Math.pow((logIntensity - logMean) / logStdDev, 2)) / 
                  (intensity * logStdDev * Math.sqrt(2 * Math.PI));
      
      // Scale to match histogram frequency scale (approximate)
      const scaledFreq = pdf * dailyCounts.length * binSize;
      const normalizedY = Math.min((scaledFreq / maxFrequency) * chartHeight, chartHeight);
      
      const x = padding.left + ((intensity - minCount) / (maxCount - minCount)) * chartWidth;
      curvePoints.push({ x, y: height - padding.bottom - normalizedY });
    }
  }
  
  // Build smooth curve path
  const curvePath = curvePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="xMidYMid meet">
        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
        
        {/* Histogram bars */}
        {histogram.map((freq, i) => {
          const barWidth = chartWidth / binCount;
          const barHeight = (freq / maxFrequency) * chartHeight;
          const x = padding.left + i * barWidth;
          const y = height - padding.bottom - barHeight;
          const intensity = minCount + i * binSize;
          const isTop10 = intensity >= top10Threshold;
          
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth - 1}
              height={barHeight}
              fill={isTop10 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.06)'}
              stroke="none"
            />
          );
        })}
        
        {/* Log-normal curve overlay */}
        <path
          d={curvePath}
          fill="none"
          stroke="rgba(16, 185, 129, 0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Individual days as faint vertical ticks */}
        {dailyCounts.map((count, i) => {
          const x = padding.left + ((count - minCount) / (maxCount - minCount)) * chartWidth;
          const isTop10 = count >= top10Threshold;
          
          return (
            <line
              key={i}
              x1={x}
              y1={height - padding.bottom - 2}
              x2={x}
              y2={height - padding.bottom + 2}
              stroke={isTop10 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.12)'}
              strokeWidth="0.5"
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function LifetimePage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [computeError, setComputeError] = useState<{ message: string; debug?: any } | null>(null);
  const [insightArtifact, setInsightArtifact] = useState<InsightArtifact | null>(null);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [windowDistribution, setWindowDistribution] = useState<WindowDistribution | null>(null);
  const { narrativeTone, handleToneChange } = useNarrativeTone(address, mounted);
  const { densityMode, handleDensityChange } = useDensity(address, mounted);
  const { backgroundOffset, foregroundOffset } = useParallax();

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

        const reflectionEntries = items.map((item) => itemToReflectionEntry(item));
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
  }, [mounted, isConnected, address, encryptionReady, sessionKey]);

  // Compute lifetime artifact via canonical engine
  useEffect(() => {
    if (reflections.length === 0 || !address) {
      setDistributionResult(null);
      setWindowDistribution(null);
      setComputeError(null);
      setIsComputing(false);
      setInsightArtifact(null);
      return;
    }

    // Reset state
    setComputeError(null);
    setIsComputing(true);

    // Wrap compute in async function
    const computeAsync = async () => {
      try {
        // Dev log: Start compute
        if (process.env.NODE_ENV === 'development') {
          console.log('[Lifetime] start compute with reflectionsCount, eventsCount:', {
            reflectionsCount: reflections.length,
            eventsCount: reflections.length,
          });
        }

        // Convert reflections to UnifiedInternalEvent format (same pattern as other lenses)
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

        // Determine window: use all available reflections (lifetime spans all time)
        const dates = reflections.map((r) => new Date(r.createdAt));
        const windowEnd = dates.length > 0 
          ? new Date(Math.max(...dates.map(d => d.getTime())))
          : new Date();
        const windowStart = dates.length > 0
          ? new Date(Math.min(...dates.map(d => d.getTime())))
          : new Date(windowEnd.getTime() - 10 * 365 * 24 * 60 * 60 * 1000); // Default to 10 years back

        // Compute lifetime artifact via canonical engine
        // Pass reflections as fallback in case eventsToReflectionEntries fails
        const artifact = computeInsightsForWindow({
          horizon: 'lifetime',
          events,
          windowStart,
          windowEnd,
          wallet: address ?? undefined,
          entriesCount: reflections.length,
          eventsCount: events.length,
          reflectionsLoaded: reflections.length,
          eventsGenerated: events.length,
          reflections: reflections.map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            plaintext: r.plaintext ?? '',
          })),
        } as any);

        // Dev log: Artifact created
        if (process.env.NODE_ENV === 'development') {
          console.log('[Lifetime] artifact created with cardsLength and cardKinds:', {
            cardsLength: artifact.cards?.length ?? 0,
            cardKinds: artifact.cards?.map(c => c.kind) ?? [],
          });
        }

        setIsComputing(false);

        // Store artifact for debug panel
        setInsightArtifact(artifact);

        // Dev log: State set
        if (process.env.NODE_ENV === 'development') {
          console.log('[Lifetime] state set after setArtifact');
        }

        // Extract DistributionResult and WindowDistribution from artifact card metadata
        const cards = artifact.cards ?? [];
        const lifetimeCard = cards.find((c) => c.kind === 'distribution');
        
        if (lifetimeCard) {
          const cardWithMeta = lifetimeCard as any;
          if (cardWithMeta._distributionResult) {
            setDistributionResult(cardWithMeta._distributionResult);
          }
          if (cardWithMeta._windowDistribution) {
            setWindowDistribution(cardWithMeta._windowDistribution);
          }
        } else {
          setDistributionResult(null);
          setWindowDistribution(null);
        }
      } catch (err) {
        setIsComputing(false);
        console.error('Failed to compute lifetime insights:', err);
        setComputeError({
          message: err instanceof Error ? err.message : 'Unknown error during computation',
          debug: {
            reflectionsCount: reflections.length,
            error: String(err),
          },
        });
        setDistributionResult(null);
        setWindowDistribution(null);
      }
    };

    computeAsync();
  }, [reflections, address]);

  // Build SharePack from lifetime lens state - always returns a SharePack
  const sharePack = useMemo<SharePack>(() => {
    if (!address) {
      // Minimal fallback when no wallet connected
      return buildSharePackForLens({
        lens: 'lifetime',
        oneSentenceSummary: 'Lifetime Analysis',
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
      const entryCount = distributionResult?.totalEntries ?? reflections.length;
      const concentration = distributionResult?.stats.top10PercentDaysShare ?? 0;
      
      // Get distribution label from windowDistribution or distributionResult
      const distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none' = 
        entryCount === 0 ? 'none' :
        windowDistribution?.classification === 'powerlaw' ? 'powerlaw' :
        windowDistribution?.classification === 'lognormal' ? 'lognormal' :
        concentration > 0.4 ? 'powerlaw' :
        concentration > 0.2 ? 'lognormal' :
        'normal';

      // Get one sentence summary
      const oneSentenceSummary = entryCount > 0 
        ? `Lifetime analysis of ${entryCount} reflection${entryCount === 1 ? '' : 's'}` 
        : 'Lifetime Analysis';

      // Get key moments from top spike dates
      const keyMoments: Array<{ date: string }> = [];
      if (windowDistribution?.topSpikeDates) {
        for (const dateStr of windowDistribution.topSpikeDates.slice(0, 5)) {
          try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            keyMoments.push({ date: date.toISOString() });
          } catch {
            // Skip invalid dates
          }
        }
      }

      // Calculate active days from reflections
      const activeDays = distributionResult ? computeActiveDays(distributionResult.dailyCounts) : 0;

      // Calculate spike count from distributionResult stats
      const spikeCount = distributionResult?.stats.spikeRatio ? 
        Math.round(distributionResult.stats.spikeRatio * 10) : 0;

      // Get period from distributionResult or use all reflections
      const periodStart = distributionResult?.dateRange.start.toISOString() ?? 
        (reflections.length > 0 ? new Date(reflections[reflections.length - 1].createdAt).toISOString() : new Date().toISOString());
      const periodEnd = distributionResult?.dateRange.end.toISOString() ?? new Date().toISOString();

      return buildSharePackForLens({
        lens: 'lifetime',
        oneSentenceSummary,
        entryCount,
        activeDays,
        distributionLabel,
        concentrationShareTop10PercentDays: concentration,
        spikeCount,
        keyMoments,
        periodStart,
        periodEnd,
        generatedAt: new Date().toISOString(),
        mirrorInsight: null,
      });
    } catch (err) {
      console.error('Failed to build lifetime SharePack:', err);
      // Minimal fallback on error
      return buildSharePackForLens({
        lens: 'lifetime',
        oneSentenceSummary: 'Lifetime Analysis',
        entryCount: reflections.length,
        activeDays: 0,
        distributionLabel: 'none',
        concentrationShareTop10PercentDays: 0,
        spikeCount: 0,
        keyMoments: [],
        generatedAt: new Date().toISOString(),
      });
    }
  }, [reflections, address, distributionResult, windowDistribution]);

  if (!mounted) return null;

  const lens = LENSES.lifetime;

  // Dev log: Render gate
  if (process.env.NODE_ENV === 'development') {
    const cards = insightArtifact?.cards ?? [];
    const lifetimeCard = cards.find((c) => c.kind === 'distribution');
    const hasLifetimeCard = !!lifetimeCard;
    console.log('[Lifetime] render gate with hasLifetimeCard and loading and error:', {
      hasLifetimeCard,
      loading,
      isComputing,
      error: error ?? null,
      computeError: computeError?.message ?? null,
      cardsLength: cards.length,
    });
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        <InsightDebugPanel debug={insightArtifact?.debug} />

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">Loading reflections...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {computeError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-rose-400 mb-2">Computation Error</h3>
                <p className="text-sm text-white/70">{computeError.message}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && reflections.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">
              No reflections yet. Start writing reflections to see lifetime insights.
            </p>
          </div>
        )}

        {!loading && !error && !computeError && reflections.length > 0 && (() => {
          const cards = insightArtifact?.cards ?? [];
          const lifetimeCard = cards.find((c) => c.kind === 'distribution');
          const hasLifetimeCard = !!lifetimeCard;

          // Show loading state
          if (isComputing) {
            return (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-white/60">
                  Computing lifetime insights...
                </p>
              </div>
            );
          }

          // Show content if card exists
          if (hasLifetimeCard && distributionResult && windowDistribution) {
            const activeDays = computeActiveDays(distributionResult.dailyCounts);
            const topSpikeDates = getTopSpikeDates(distributionResult, 5);
            const topDay = distributionResult.topDays[0]; // Deterministic: count desc, then date desc (most recent wins ties)
            const spikeRatio = distributionResult.stats.spikeRatio;
            const top10Share = distributionResult.stats.top10PercentDaysShare;

            // Dev log: Verify topDays[0] matches narrative
            if (process.env.NODE_ENV === 'development' && topDay) {
              console.log('[Lifetime] topDays[0] for Most Intense Day:', {
                date: topDay.date,
                count: topDay.count,
                formatted: new Date(topDay.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }),
              });
            }

            const toneCopy = TONE_COPY[narrativeTone];

            return (
              <div className="space-y-6">
                {/* Lifetime Distribution Card */}
              <div 
                className="rounded-2xl bg-emerald-500/5 p-6 space-y-4 relative overflow-hidden"
                style={{
                  boxShadow: '0 -2px 8px rgba(16,185,129,0.2), -2px 0 8px rgba(16,185,129,0.15), 2px 0 8px rgba(16,185,129,0.15)',
                }}
              >
                  {/* Subtle vertical gradients - parallax background */}
                  <div 
                    className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
                    style={{
                      transform: `translateY(${backgroundOffset}px)`,
                      transition: 'transform 0.1s ease-out',
                    }}
                  >
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-emerald-500/10 via-emerald-500/2 to-transparent" />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-emerald-500/10 via-emerald-500/2 to-transparent" />
                  </div>
                  {/* Bottom edge fade - parallax background (contained) */}
                  <div 
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/50 to-transparent rounded-b-2xl overflow-hidden"
                    style={{
                      transform: `translateY(${backgroundOffset}px)`,
                      transition: 'transform 0.1s ease-out',
                    }}
                  />
                    <div className="flex items-start justify-between mb-4">
                    <h2 className="text-lg font-medium text-emerald-200">Lifetime Distribution</h2>
                    
                    {/* Narrative Tone Selector */}
                    <NarrativeToneSelector tone={narrativeTone} onToneChange={handleToneChange} />
                  </div>
                  
                  {/* Why this lens exists */}
                  <div className="mb-6 pb-6">
                    <ObservationalDivider />
                    <p className="text-xs text-white/50 mb-1 mt-6">Why this lens exists</p>
                    <p className="text-sm text-white/60 leading-relaxed">{getLensPurposeCopy('lifetime', narrativeTone)}</p>
                  </div>
                  
                  {/* Primary Insight */}
                  <p className="text-base text-white/70 mb-6 leading-relaxed lifetime-line-fade">
                    {toneCopy.primaryInsight}
                  </p>
                  
                  {/* Lifetime Pattern Narrative */}
                  <div className="mb-6 pb-6">
                    <ObservationalDivider />
                    <h3 className="text-sm font-medium text-white/70 mb-3 mt-6 lifetime-line-fade">Lifetime Pattern</h3>
                    <div className="space-y-3 text-sm text-white/60 leading-relaxed">
                      <p className="lifetime-line-fade">{toneCopy.patternNarrative.paragraph1}</p>
                      <p className="lifetime-line-fade">{toneCopy.patternNarrative.paragraph2}</p>
                    </div>
                  </div>
                  
                  {/* Scale */}
                  <div className="pt-4">
                    <div className="text-xs text-white/40 uppercase tracking-wide mb-3">Scale</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-white/50 mb-1">Total Reflections</div>
                        <div className="text-2xl font-semibold">{distributionResult.totalEntries}</div>
                        <p className="text-xs text-white/40 mt-1 leading-relaxed">
                          {interpretEntryCount(distributionResult.totalEntries, 'year')}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 mb-1">Active Days</div>
                        <div className="text-2xl font-semibold">{activeDays}</div>
                        <p className="text-xs text-white/40 mt-1 leading-relaxed">
                          {interpretActiveDays(activeDays, distributionResult.dailyCounts.length)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Concentration */}
                  <div className="pt-6">
                    <ObservationalDivider />
                    <div className="text-xs text-white/40 uppercase tracking-wide mb-3 mt-6">Concentration</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-white/50 mb-1">Spike Ratio</div>
                        <div className="text-2xl font-semibold">{spikeRatio.toFixed(2)}x</div>
                        <p className="text-xs text-white/40 mt-1 leading-relaxed">
                          {interpretSpikeRatio(spikeRatio)}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 mb-1">Top 10% Share</div>
                        <div className="text-2xl font-semibold">{Math.round(top10Share * 100)}%</div>
                        <p className="text-xs text-white/40 mt-1 leading-relaxed">
                          {interpretTop10Share(Math.round(top10Share * 100))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pattern */}
                  <div className="pt-6">
                    <ObservationalDivider />
                    <div className="text-xs text-white/40 uppercase tracking-wide mb-3 mt-6">Pattern</div>
                    
                    <div className="mb-4">
                      <div className="text-xs text-white/50 mb-1">Distribution Pattern</div>
                      <div className="text-xs text-white/40 mb-1">
                        {toneCopy.distributionPatternMicro(windowDistribution.classification)}
                      </div>
                      <div className="text-sm text-white/70 capitalize">
                        {windowDistribution.classification === 'lognormal' ? 'Log Normal' : 
                         windowDistribution.classification === 'powerlaw' ? 'Power Law' : 
                         'Normal'}
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        {toneCopy.distributionPatternExplanation(windowDistribution.classification)}
                      </p>
                    </div>

                    {/* Distribution View - only show for log-normal */}
                    {windowDistribution.classification === 'lognormal' && distributionResult.dailyCounts.length > 0 && (
                      <div className="mt-6 pt-6">
                        <ObservationalDivider />
                        <div className="text-xs text-white/40 uppercase tracking-wide mb-3 mt-6">Distribution View</div>
                        <DistributionVisualization
                          dailyCounts={distributionResult.dailyCounts}
                          top10PercentThreshold={Math.ceil(distributionResult.dailyCounts.length * 0.1)}
                        />
                        <p className="text-xs text-white/40 mt-4 leading-relaxed">
                          {toneCopy.distributionViewText.line1}
                          <br />
                          {toneCopy.distributionViewText.line2}
                        </p>
                      </div>
                    )}

                    {topDay && (
                      <div className="mb-4">
                        <div className="text-xs text-white/50 mb-1">Most Intense Day</div>
                        <div className="text-sm text-white/70">
                          {new Date(topDay.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })} with {topDay.count} entries
                        </div>
                        <p className="text-xs text-white/40 mt-1">
                          {toneCopy.mostIntenseDay}
                        </p>
                      </div>
                    )}

                    {topSpikeDates.length > 0 && (
                      <div>
                        <div className="text-xs text-white/50 mb-2">Top Days</div>
                        <div className="space-y-1">
                          {topSpikeDates.map((date, idx) => {
                            const dayData = distributionResult.topDays.find(d => d.date === date);
                            return (
                              <div key={date} className="text-xs text-white/60">
                                {new Date(date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}: {dayData?.count || 0} entries
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transition to boundaries */}
                  <LensTransition text="Across years, structure becomes signature." />

                  {/* What this shows / does not show */}
                  <div className="pt-6 mt-6">
                    <ObservationalDivider />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div>
                        <div className="text-white/60 font-medium mb-2">What this shows</div>
                        <ul className="space-y-1 text-white/50 list-none">
                          <li>• How your attention distributes over long time horizons</li>
                          <li>• Whether thinking accumulates gradually or arrives in bursts</li>
                          <li>• The concentration and rhythm of your cognitive effort</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-white/60 font-medium mb-2">What this does not show</div>
                        <ul className="space-y-1 text-white/50 list-none">
                          <li>• What you wrote about</li>
                          <li>• Emotional or semantic meaning of reflections</li>
                          <li>• Causes, diagnoses, or recommendations</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Closing line */}
                  <div className="mt-6 pt-6">
                    <ObservationalDivider />
                    <p className="text-sm text-white/50 mt-6 text-center italic">
                      {toneCopy.closingLine}
                    </p>
                  </div>
                </div>

                {/* Share Actions Bar */}
                <ShareActionsBar
                  sharePack={sharePack}
                  senderWallet={address}
                  encryptionReady={encryptionReady}
                />
              </div>
            );
          }

          // Show empty state if no card
          return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-white/60">
                Computing lifetime insights...
              </p>
            </div>
          );
        })()}

        {/* Session Closing */}
        <SessionClosing lens="lifetime" narrativeTone={narrativeTone} />
      </section>
    </div>
  );
}
