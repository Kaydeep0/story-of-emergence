'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import type { WindowDistribution, DistributionResult } from '../../lib/insights/distributionLayer';
import type { ReflectionEntry, InsightCard } from '../../lib/insights/types';
import { InsightDebugPanel } from '../components/InsightDebugPanel';
import type { InsightArtifact } from '../../lib/insights/artifactTypes';
import { rpcInsertEntry } from '../../lib/entries';
import { toast } from 'sonner';
import { useNarrativeTone } from '../hooks/useNarrativeTone';
import { NarrativeToneSelector } from '../components/NarrativeToneSelector';
import { useDensity } from '../hooks/useDensity';
import { DensityToggle } from '../components/DensityToggle';
import { getLensPurposeCopy, getLensBoundaries, getDistributionViewText } from '../lib/lensPurposeCopy';
import { LensTransition } from '../components/LensTransition';
import { getPreviousPeriodDailyCounts } from '../lib/temporalComparisons';
import type { IntensityLevel } from '../lib/intensitySystem';
import { getIntensityColor, getIntensityDotSize, intensityFromSpikeRatio } from '../lib/intensitySystem';
import { ObservationalDivider } from '../components/ObservationalDivider';
import { SessionClosing } from '../components/SessionClosing';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { buildSharePackForLens, type SharePack } from '../../lib/share/sharePack';
import '../styles/delights.css';

/**
 * Distribution Visualization Component
 * Renders a simple histogram with log-normal curve overlay
 */
function DistributionVisualization({ 
  dailyCounts, 
  top10PercentThreshold,
  ghostDailyCounts
}: { 
  dailyCounts: number[]; 
  top10PercentThreshold: number;
  ghostDailyCounts?: number[]; // Previous period for ghost comparison
}) {
  // Calculate histogram bins (include ghost data in range)
  const allCounts = ghostDailyCounts && ghostDailyCounts.length > 0 
    ? [...dailyCounts, ...ghostDailyCounts]
    : dailyCounts;
  const maxCount = Math.max(...allCounts);
  const minCount = Math.min(...allCounts);
  const binCount = Math.min(20, maxCount - minCount + 1);
  const binSize = (maxCount - minCount) / binCount || 1;
  
  // Create histogram for current period
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
  
  // Calculate ghost curve if provided
  let ghostCurvePath: string | null = null;
  if (ghostDailyCounts && ghostDailyCounts.length > 0) {
    const ghostLogValues = ghostDailyCounts.filter(c => c > 0).map(c => Math.log(c));
    if (ghostLogValues.length > 0) {
      const ghostLogMean = ghostLogValues.reduce((a, b) => a + b, 0) / ghostLogValues.length;
      const ghostLogVariance = ghostLogValues.reduce((sum, val) => sum + Math.pow(val - ghostLogMean, 2), 0) / ghostLogValues.length;
      const ghostLogStdDev = Math.sqrt(ghostLogVariance);
      
      const ghostCurvePoints: Array<{ x: number; y: number }> = [];
      const steps = 100;
      
      for (let i = 0; i <= steps; i++) {
        const intensity = minCount + (i / steps) * (maxCount - minCount);
        if (intensity > 0) {
          const logIntensity = Math.log(intensity);
          const pdf = Math.exp(-0.5 * Math.pow((logIntensity - ghostLogMean) / ghostLogStdDev, 2)) / 
                      (intensity * ghostLogStdDev * Math.sqrt(2 * Math.PI));
          const scaledFreq = pdf * ghostDailyCounts.length * binSize;
          const normalizedY = Math.min((scaledFreq / maxFrequency) * chartHeight, chartHeight);
          const x = padding.left + ((intensity - minCount) / (maxCount - minCount)) * chartWidth;
          ghostCurvePoints.push({ x, y: height - padding.bottom - normalizedY });
        }
      }
      
      ghostCurvePath = ghostCurvePoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');
    }
  }
  
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
        
        {/* Ghost curve (previous period) */}
        {ghostCurvePath && (
          <path
            d={ghostCurvePath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
            opacity={0.5}
          />
        )}
        
        {/* Log-normal curve overlay */}
        <path
          d={curvePath}
          fill="none"
          stroke="rgba(16, 185, 129, 0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Individual days as faint dots */}
        {dailyCounts.map((count, i) => {
          const x = padding.left + ((count - minCount) / (maxCount - minCount)) * chartWidth;
          const isTop10 = count >= top10Threshold;
          // Compute intensity from count relative to max
          const relativeIntensity = maxCount > 0 ? count / maxCount : 0;
          const dotIntensity: IntensityLevel = relativeIntensity >= 0.7 ? 'high' : relativeIntensity >= 0.4 ? 'medium' : 'low';
          const dotSize = getIntensityDotSize(dotIntensity);
          const dotColor = isTop10 ? getIntensityColor(dotIntensity, 0.6) : getIntensityColor(dotIntensity, 0.2);
          
          return (
            <circle
              key={i}
              cx={x}
              cy={height - padding.bottom - 2}
              r={dotSize}
              fill={dotColor}
            />
          );
        })}
        
        {/* Labels */}
        <text
          x={padding.left - 5}
          y={height - padding.bottom + 5}
          textAnchor="end"
          fill="rgba(255, 255, 255, 0.3)"
          fontSize="10"
        >
          {minCount}
        </text>
        <text
          x={width - padding.right}
          y={height - padding.bottom + 5}
          textAnchor="start"
          fill="rgba(255, 255, 255, 0.3)"
          fontSize="10"
        >
          {maxCount}
        </text>
      </svg>
    </div>
  );
}

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
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [distributionInsight, setDistributionInsight] = useState<InsightCard | null>(null);
  const [insightArtifact, setInsightArtifact] = useState<InsightArtifact | null>(null);
  const { narrativeTone, handleToneChange } = useNarrativeTone(address, mounted);
  const { densityMode, handleDensityChange } = useDensity(address, mounted);

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

  // Compute distributions via canonical engine
  useEffect(() => {
    if (reflections.length === 0 || !address) {
      setDistributions([]);
      setDistributionResult(null);
      setDistributionInsight(null);
      return;
    }

    // Dev log: Start compute
    if (process.env.NODE_ENV === 'development') {
      console.log('[Distributions Page] Start compute:', {
        reflectionsCount: reflections.length,
        address: address,
      });
    }

    try {
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

      // Determine window: use all available reflections (distributions analyzes all data)
      // Use the same timestamp source as event generation (r.createdAt -> eventAt)
      const dates = reflections.map((r) => new Date(r.createdAt));
      const windowEnd = dates.length > 0 
        ? new Date(Math.max(...dates.map(d => d.getTime())))
        : new Date();
      const windowStart = dates.length > 0
        ? new Date(Math.min(...dates.map(d => d.getTime())))
        : new Date(windowEnd.getTime() - 365 * 24 * 60 * 60 * 1000); // Default to 1 year back
      
      // Dev log: Window boundaries (aligned with event timestamps)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Distributions Page] Window boundaries:', {
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
          reflectionsCount: reflections.length,
          eventsCount: events.length,
          // Show sample event timestamps
          sampleEventEventAt: events.length > 0 ? events[0].eventAt : null,
          sampleReflectionCreatedAt: reflections.length > 0 ? reflections[0].createdAt : null,
          // Verify alignment
          firstEventTimestamp: events.length > 0 ? new Date(events[0].eventAt).toISOString() : null,
          firstReflectionTimestamp: reflections.length > 0 ? new Date(reflections[0].createdAt).toISOString() : null,
        });
      }

      // Dev log: Before compute
      if (process.env.NODE_ENV === 'development') {
        console.log('[Distributions Page] Before computeInsightsForWindow:', {
          eventsCount: events.length,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
        });
      }

      // Compute distributions artifact via canonical engine
      // Pass reflections as fallback in case eventsToReflectionEntries fails
      const artifact = computeInsightsForWindow({
        horizon: 'distributions',
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
        console.log('[Distributions Page] Artifact created with cardsLength:', artifact.cards?.length ?? 0, {
          horizon: artifact.horizon,
          cardsLength: artifact.cards?.length ?? 0,
          cardKinds: artifact.cards?.map(c => c.kind) ?? [],
          debugEventCount: artifact.debug?.eventCount,
        });
      }

      // Store artifact for debug panel
      setInsightArtifact(artifact);

      // Dev log: Artifact stored
      if (process.env.NODE_ENV === 'development') {
        console.log('[Distributions Page] Artifact stored in state');
      }

      // Extract data structures from artifact card metadata
      // Look for card with kind 'distribution' (standardized)
      const cards = artifact.cards ?? [];
      
      // Dev log: Card kinds before search
      if (process.env.NODE_ENV === 'development') {
        const allCardKinds = cards.map(c => c.kind);
        console.log('[Distributions Page] Card extraction - before search:', {
          cardsLength: cards.length,
          allCardKinds,
        });
      }
      
      // Standardized to 'distribution' kind
      const distributionsCard = cards.find((c) => c.kind === 'distribution');
      
      // Dev log: Card extraction
      if (process.env.NODE_ENV === 'development') {
        console.log('[Distributions Page] Card extraction:', {
          cardsLength: cards.length,
          distributionsCardExists: !!distributionsCard,
          distributionsCardKind: distributionsCard ? (distributionsCard.kind as string) : null,
          distributionsCardId: distributionsCard?.id,
          distributionsCardKeys: distributionsCard ? Object.keys(distributionsCard) : [],
          hasDistributionResult: distributionsCard ? '_distributionResult' in distributionsCard : false,
          hasWindowDistributions: distributionsCard ? '_windowDistributions' in distributionsCard : false,
          hasDistributionInsight: distributionsCard ? '_distributionInsight' in distributionsCard : false,
        });
      }
      
      if (distributionsCard) {
        const cardWithMeta = distributionsCard as InsightCard & {
          _distributionResult?: DistributionResult;
          _windowDistributions?: WindowDistribution[];
          _distributionInsight?: InsightCard | null;
        };
        
        // Dev log: Metadata extraction
        if (process.env.NODE_ENV === 'development') {
          console.log('[Distributions Page] Metadata extraction:', {
            distributionResultExists: !!cardWithMeta._distributionResult,
            distributionResultTotalEntries: cardWithMeta._distributionResult?.totalEntries,
            windowDistributionsLength: cardWithMeta._windowDistributions?.length ?? 0,
            distributionInsightExists: !!cardWithMeta._distributionInsight,
            distributionInsightTitle: cardWithMeta._distributionInsight?.title,
          });
        }
        
        // Extract metadata - these keys match what computeDistributionsArtifact writes
        setDistributionResult(cardWithMeta._distributionResult ?? null);
        setDistributions(cardWithMeta._windowDistributions ?? []);
        setDistributionInsight(cardWithMeta._distributionInsight ?? null);

        // Dev log: State updated
        if (process.env.NODE_ENV === 'development') {
          console.log('[Distributions Page] State updated (UI will receive artifact)');
        }
      } else {
        // No card generated (likely no entries in window or computation failed)
        // Dev log: No card
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Distributions Page] No distributions card found:', {
            cardsLength: cards.length,
            allCardKinds: cards.map(c => c.kind),
            windowEntriesCount: events.length, // This is approximate - actual filtering happens in artifact builder
          });
        }
        
        // Always set to empty/null to ensure consistent state
        setDistributions([]);
        setDistributionResult(null);
        setDistributionInsight(null);
      }
    } catch (err) {
      console.error('[Distributions Page] Failed to compute distributions insights:', err);
      setDistributions([]);
      setDistributionResult(null);
      setDistributionInsight(null);
    }
  }, [reflections, address]);

  // Dev log: State changes (UI received artifact)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Distributions Page] UI received artifact (state updated):', {
        hasDistributionResult: !!distributionResult,
        hasDistributionInsight: !!distributionInsight,
        distributionsLength: distributions.length,
        distributionResultTotalEntries: distributionResult?.totalEntries,
        distributionInsightTitle: distributionInsight?.title,
      });
    }
  }, [distributionResult, distributionInsight, distributions]);

  // Build SharePack from distributions lens state - always returns a SharePack
  const sharePack = useMemo<SharePack>(() => {
    if (!address) {
      // Minimal fallback when no wallet connected
      return buildSharePackForLens({
        lens: 'distributions',
        oneSentenceSummary: 'Distribution Analysis',
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
      
      // Get distribution label from distributionResult or distributions array
      const dist30 = distributions.find(d => d.windowDays === 30);
      const distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none' = 
        entryCount === 0 ? 'none' :
        dist30?.classification === 'powerlaw' ? 'powerlaw' :
        dist30?.classification === 'lognormal' ? 'lognormal' :
        concentration > 0.4 ? 'powerlaw' :
        concentration > 0.2 ? 'lognormal' :
        'normal';

      // Get one sentence summary from distributionInsight or fallback
      const oneSentenceSummary = distributionInsight?.title || 
        (entryCount > 0 ? `Distribution analysis of ${entryCount} reflection${entryCount === 1 ? '' : 's'}` : 'Distribution Analysis');

      // Get key moments from top spike dates
      const keyMoments: Array<{ date: string }> = [];
      if (dist30?.topSpikeDates) {
        for (const dateStr of dist30.topSpikeDates.slice(0, 5)) {
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
      const activeDaysSet = new Set<string>();
      for (const reflection of reflections) {
        const dateKey = `${new Date(reflection.createdAt).getFullYear()}-${String(new Date(reflection.createdAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(reflection.createdAt).getDate()).padStart(2, '0')}`;
        activeDaysSet.add(dateKey);
      }
      const activeDays = activeDaysSet.size;

      // Calculate spike count from distributionResult stats
      const spikeCount = distributionResult?.stats.spikeRatio ? 
        Math.round(distributionResult.stats.spikeRatio * 10) : 0;

      // Get period from distributionResult or use all reflections
      const periodStart = distributionResult?.dateRange.start.toISOString() ?? 
        (reflections.length > 0 ? new Date(reflections[reflections.length - 1].createdAt).toISOString() : new Date().toISOString());
      const periodEnd = distributionResult?.dateRange.end.toISOString() ?? new Date().toISOString();

      return buildSharePackForLens({
        lens: 'distributions',
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
        mirrorInsight: distributionInsight?.explanation || null,
      });
    } catch (err) {
      console.error('Failed to build distributions SharePack:', err);
      // Minimal fallback on error
      return buildSharePackForLens({
        lens: 'distributions',
        oneSentenceSummary: 'Distribution Analysis',
        entryCount: reflections.length,
        activeDays: 0,
        distributionLabel: 'none',
        concentrationShareTop10PercentDays: 0,
        spikeCount: 0,
        keyMoments: [],
        generatedAt: new Date().toISOString(),
      });
    }
  }, [reflections, address, distributionResult, distributionInsight, distributions]);

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

  // Handle saving highlight to Supabase (reusing existing entry save pattern)
  const handleSaveHighlight = async () => {
    // Gate: wallet connection
    if (!connected || !address) {
      toast.error('Connect wallet to save');
      return;
    }

    // Gate: encryption session
    if (!encryptionReady || !sessionKey) {
      toast.error('Unlock vault to save');
      return;
    }

    // Gate: must have insight
    if (!distributionInsight) {
      toast.error('No insight to save');
      return;
    }

    try {
      // Get 30-day distribution for metadata
      const dist30 = distributions.find(d => d.windowDays === 30);
      
      // Build highlight payload (same pattern as other entries)
      const highlightPayload = {
        type: 'highlight',
        subtype: 'distribution-layer',
        title: distributionInsight.title,
        body: distributionInsight.explanation,
        evidence: distributionInsight.evidence.map(ev => ({
          entryId: ev.entryId,
          timestamp: ev.timestamp,
          preview: ev.preview,
        })),
        metadata: {
          insightId: distributionInsight.id,
          kind: distributionInsight.kind,
          computedAt: distributionInsight.computedAt,
          // Include distribution params
          windowDays: 30,
          classification: dist30?.classification || 'unknown',
          topSpikeDates: dist30?.topSpikeDates || [],
          frequencyPerDay: dist30?.frequencyPerDay || 0,
          magnitudeProxy: dist30?.magnitudeProxy || 0,
          // Include computed stats (if available)
          ...(distributionResult ? {
            mostCommonDayCount: distributionResult.stats.mostCommonDayCount,
            variance: distributionResult.stats.variance,
            spikeRatio: distributionResult.stats.spikeRatio,
            top10PercentDaysShare: distributionResult.stats.top10PercentDaysShare,
          } : {}),
        },
        ts: Date.now(),
      };

      // Call the same helper used by other pages (rpcInsertEntry)
      await rpcInsertEntry(address, sessionKey, highlightPayload);

      // Toast success
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-center flex-1">Distribution Analysis</h1>
          <div className="flex items-center gap-2">
            <DensityToggle density={densityMode} onDensityChange={handleDensityChange} />
            <NarrativeToneSelector tone={narrativeTone} onToneChange={handleToneChange} />
          </div>
        </div>

        {/* Why this lens exists */}
        <div className="mb-6 pb-6 border-b border-white/10">
          <p className="text-xs text-white/50 mb-1">Why this lens exists</p>
          <p className="text-sm text-white/60 leading-relaxed">{getLensPurposeCopy('distributions', narrativeTone)}</p>
        </div>

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

        {/* Render gating based on eventCount and card existence */}
        {(() => {
          const eventCount = insightArtifact?.debug?.eventCount ?? 0;
          const cards = insightArtifact?.cards ?? [];
          // Standardized to 'distribution' kind
          const distributionsCard = cards.find((c) => c.kind === 'distribution');
          const hasDistributionCard = Boolean(distributionsCard);
          
          // Dev log: Card search
          if (process.env.NODE_ENV === 'development') {
            const allCardKinds = cards.map(c => c.kind);
            console.log('[Distributions Page] Card search:', {
              cardsLength: cards.length,
              allCardKinds,
              distributionsCardExists: hasDistributionCard,
              distributionsCardKind: distributionsCard ? distributionsCard.kind : null,
            });
          }

          // Empty state: eventCount === 0
          if (!loading && !error && eventCount === 0) {
            return (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">No reflections found. Start writing to see distribution analysis.</p>
          </div>
            );
          }

          // Computing placeholder: eventCount > 0 AND no distribution card exists
          if (!loading && !error && eventCount > 0 && !hasDistributionCard) {
            return (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center mb-6">
                <p className="text-white/70 mb-2">Distribution analysis is being computed.</p>
                <p className="text-sm text-white/50">Please wait...</p>
              </div>
            );
          }

          // Otherwise render the page (eventCount > 0 AND hasDistributionCard)
          return null;
        })()}

        {/* Distribution Content - render when card exists, with null-safe guards */}
        {(() => {
          const eventCount = insightArtifact?.debug?.eventCount ?? 0;
          const cards = insightArtifact?.cards ?? [];
          // Standardized to 'distribution' kind
          const distributionsCard = cards.find((c) => c.kind === 'distribution');
          const hasDistributionCard = Boolean(distributionsCard);
          
          // Dev log: Card search
          if (process.env.NODE_ENV === 'development') {
            const allCardKinds = cards.map(c => c.kind);
            console.log('[Distributions Page] Content render card search:', {
              cardsLength: cards.length,
              allCardKinds,
              distributionsCardExists: hasDistributionCard,
              distributionsCardKind: distributionsCard ? distributionsCard.kind : null,
            });
          }

          // Only render content if eventCount > 0 AND card exists
          if (loading || error || eventCount === 0 || !hasDistributionCard) {
            return null;
          }

          return (
            <>
              {/* Distribution Stats - null-safe guard */}
              {distributionResult && distributionResult.totalEntries > 0 && (
          <div className="mb-8 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Distribution Profile (30 days)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Most Common Day Count</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.mostCommonDayCount}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Variance</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.variance.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Spike Ratio</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.spikeRatio.toFixed(2)}x</div>
                  <div className="text-xs text-white/40 mt-1">max day / median day</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Top 10% Days Share</div>
                  <div className="text-2xl font-bold text-white">{(distributionResult.stats.top10PercentDaysShare * 100).toFixed(1)}%</div>
                  <div className="text-xs text-white/40 mt-1">power law signal</div>
                </div>
              </div>

                    {/* Distribution View - show for log-normal or power law patterns */}
                    {(() => {
                      const dist30 = distributions.find(d => d.windowDays === 30);
                      const classification = dist30?.classification || 'unknown';
                      const isVisualizable = classification === 'lognormal' || classification === 'powerlaw';
                      
                      if (!isVisualizable || !distributionResult.dailyCounts || distributionResult.dailyCounts.length === 0) {
                        return null;
                      }

                      const viewText = getDistributionViewText(narrativeTone);
                      
                      return (
                        <div className="mt-6 pt-6 distribution-reveal">
                          <ObservationalDivider />
                          <div className="text-xs text-white/40 uppercase tracking-wide mb-3 mt-6">Distribution View</div>
                          <DistributionVisualization
                            dailyCounts={distributionResult.dailyCounts}
                            top10PercentThreshold={Math.ceil(distributionResult.dailyCounts.length * 0.1)}
                            ghostDailyCounts={(() => {
                              // Get previous 30-day period for ghost comparison
                              const now = new Date();
                              const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                              const currentEnd = now;
                              try {
                                return getPreviousPeriodDailyCounts(
                                  reflections,
                                  currentStart,
                                  currentEnd,
                                  'month'
                                );
                              } catch {
                                return undefined;
                              }
                            })()}
                          />
                          <p className="text-xs text-white/40 mt-4 leading-relaxed">
                            {viewText.line1}
                            <br />
                            {viewText.line2}
                          </p>
                        </div>
                      );
                    })()}
            </div>

                  {/* Top Days List - null-safe guard */}
                  {distributionResult.topDays && distributionResult.topDays.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-md font-semibold mb-3">Top Days</h3>
                <div className="space-y-2">
                  {distributionResult.topDays.slice(0, 10).map((day, idx) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{formatDate(day.date)}</span>
                      <span className="text-white/90 font-medium">{day.count} entries</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

              {/* Distribution Insight Card - null-safe guard */}
              {distributionInsight && (
          <div className="mb-8">
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
              {/* Card header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-orange-200">{distributionInsight.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                </div>
              </div>

              {/* Explanation */}
              <p className="text-sm text-white/70">{distributionInsight.explanation}</p>

              {/* Computed locally badge */}
              <p className="text-xs text-white/40">Computed locally</p>
            </div>
          </div>
        )}

              {/* Distributions Table - null-safe guard */}
              {distributions && distributions.length > 0 && (
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
                      {dist.topSpikeDates && dist.topSpikeDates.length > 0 ? (
                        <ul className="space-y-1">
                          {dist.topSpikeDates.map((date, idx) => (
                            <li key={idx}>{formatDate(date)}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-white/40">No spikes</span>
                      )}
                    </td>
                    <td className="p-4 text-white/70 text-sm">{dist.explanation || 'No explanation available'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

              {/* Transition to boundaries */}
              {distributionsCard && (
                <LensTransition text="Short bursts compound into longer-term structure." />
              )}

              {/* What this shows / does not show */}
              {distributionsCard && (() => {
                const boundaries = getLensBoundaries('distributions', narrativeTone);
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
          );
        })()}

        {/* Share Actions */}
        <ShareActionsBar
          sharePack={sharePack}
          senderWallet={address}
          encryptionReady={encryptionReady}
        />

        {/* Session Closing */}
        <SessionClosing lens="distributions" narrativeTone={narrativeTone} />
      </section>
    </main>
  );
}

