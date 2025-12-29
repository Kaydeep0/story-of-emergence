'use client';

/**
 * Yearly Wrap Assembly - Read-Only
 * 
 * Assembles yearly insights, narratives, deltas, density, and cadence
 * into a single coherent Yearly Wrap object.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { buildDistributionFromReflections } from '../../lib/distributions/buildSeries';
import { classifyDistribution } from '../../lib/distributions/classify';
import { generateDistributionInsight } from '../../lib/distributions/insights';
import { generateNarrative } from '../../lib/distributions/narratives';
import { inspectDistribution } from '../../lib/distributions/inspect';
import { compareNarratives } from '../../lib/distributions/deltas';
import { fromNarrative, fromDelta } from '../../lib/insights/viewModels';
import { generateInsightLabel } from '../../lib/insights/labels';
import { buildYearlyWrap } from '../../lib/wrap/yearlyWrap';
import type { ReflectionEntry } from '../../lib/insights/types';
import type { InsightCard, InsightDeltaCard } from '../../lib/insights/viewModels';
import { InsightPanel } from '../components/InsightPanel';

export default function YearlyWrapPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);

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

  // Generate yearly insights and deltas
  const yearlyWrap = useMemo(() => {
    if (reflections.length === 0) {
      return null;
    }

    const yearlyInsights: InsightCard[] = [];
    const yearlyDeltas: InsightDeltaCard[] = [];

    // Generate yearly insight
    const yearSeries = buildDistributionFromReflections(
      reflections,
      'month', // Year scope uses month buckets
      'normal'
    );

    const yearShape = classifyDistribution(yearSeries);
    if (yearShape !== 'insufficient_data') {
      const classifiedSeries = { ...yearSeries, shape: yearShape };
      const insight = generateDistributionInsight(classifiedSeries, yearShape);
      
      if (insight) {
        const stats = inspectDistribution(classifiedSeries);
        const narrative = generateNarrative('year', insight, stats.totalEvents);
        
        const bucketCounts = classifiedSeries.points.map(p => p.weight);
        const label = generateInsightLabel({
          totalEvents: stats.totalEvents,
          scope: 'year',
          bucketCounts,
        });
        
        const card = fromNarrative(narrative, label);
        yearlyInsights.push(card);
      }
    }

    // Generate deltas by comparing with previous period
    // For now, we'll generate empty deltas (can be enhanced later)
    // TODO: Compare current year with previous year to generate deltas

    return buildYearlyWrap({
      yearlyInsights,
      yearlyDeltas,
    });
  }, [reflections]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-8">Yearly Wrap</h1>
          <p className="text-white/60">Loading reflections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-8">Yearly Wrap</h1>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!yearlyWrap) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-8">Yearly Wrap</h1>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-sm text-white/60">
              Not enough data to generate a yearly wrap. Keep reflecting to see your year in review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">Yearly Wrap</h1>

        {/* Headline */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold mb-2">{yearlyWrap.headline}</h2>
          <p className="text-white/80 leading-relaxed">{yearlyWrap.summary}</p>
        </div>

        {/* Dominant Pattern */}
        {yearlyWrap.dominantPattern && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="text-sm font-semibold text-white/60 mb-2">Dominant Pattern</h3>
            <p className="text-white/80">{yearlyWrap.dominantPattern}</p>
          </div>
        )}

        {/* Key Moments */}
        {yearlyWrap.keyMoments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Key Moments</h3>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <InsightPanel insights={yearlyWrap.keyMoments} />
            </div>
          </div>
        )}

        {/* Shifts */}
        {yearlyWrap.shifts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shifts</h3>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="space-y-3">
                {yearlyWrap.shifts.map((shift) => (
                  <div key={shift.id} className="flex items-start gap-2 text-sm">
                    <span className="text-white/50 mt-0.5 shrink-0">
                      {shift.direction === 'intensifying' ? '↑' : 
                       shift.direction === 'stabilizing' ? '→' : 
                       shift.direction === 'fragmenting' ? '↯' : '—'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-white/90">{shift.headline}</p>
                      <p className="text-white/60 mt-0.5">{shift.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

