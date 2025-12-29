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
import { YearlyWrapContainer } from '../../components/wrap/YearlyWrapContainer';
import { generateSharePack } from '../../lib/share/generateSharePack';
import { generateYearlyContinuity, buildPriorYearWrap } from '../../lib/continuity/continuity';
import { generateConceptualClusters, generateClusterAssociations, getAssociationsForCluster, getAssociatedClusterId, calculateClusterDistance, getDistancePhrase, detectFadedClusters } from '../../lib/clusters/conceptualClusters';
import { SpatialClusterLayout } from '../../components/clusters/SpatialClusterLayout';
import { detectRegime } from '../../lib/regime/detectRegime';
import { generateContinuations } from '../../lib/continuations/generateContinuations';
import { generateRegimeNarrative } from '../../lib/narrative/generateRegimeNarrative';
import { inferObserverPosition } from '../../lib/position/inferObserverPosition';

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
        const narrative = generateNarrative('year', insight);
        
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

  // Generate continuity note from prior year
  const continuityNote = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    const priorYear = currentYear - 1;

    const priorYearWrap = buildPriorYearWrap(reflections, priorYear);
    if (!priorYearWrap) {
      return null;
    }

    return generateYearlyContinuity(yearlyWrap, priorYearWrap);
  }, [yearlyWrap, reflections]);

  // Detect regime (internal only, never rendered)
  const regime = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0) {
      return 'deterministic' as const;
    }

    // Generate initial clusters for regime detection
    const initialClusters = generateConceptualClusters(reflections, yearlyWrap);
    const currentYear = new Date().getFullYear().toString();
    const initialAssociations = initialClusters.length >= 2
      ? generateClusterAssociations(initialClusters, currentYear)
      : [];

    return detectRegime({
      clusters: initialClusters,
      associations: initialAssociations,
      currentPeriod: currentYear,
    });
  }, [yearlyWrap, reflections]);

  // Generate conceptual clusters (with regime gating)
  const conceptualClusters = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0) {
      return [];
    }

    const clusters = generateConceptualClusters(reflections, yearlyWrap, regime);
    
    // Detect faded clusters (appeared in prior periods but not current period)
    const currentYear = new Date().getFullYear().toString();
    return detectFadedClusters(clusters, currentYear);
  }, [yearlyWrap, reflections, regime]);

  // Generate cluster associations
  const clusterAssociations = useMemo(() => {
    if (conceptualClusters.length < 2) {
      return [];
    }

    const currentYear = new Date().getFullYear().toString();
    return generateClusterAssociations(conceptualClusters, currentYear);
  }, [conceptualClusters]);

  // Generate continuations (only for transitional/emergent regimes)
  const continuations = useMemo(() => {
    if (conceptualClusters.length < 2) {
      return [];
    }

    const currentYear = new Date().getFullYear().toString();
    return generateContinuations({
      clusters: conceptualClusters,
      associations: clusterAssociations,
      regime,
      currentPeriod: currentYear,
    });
  }, [conceptualClusters, clusterAssociations, regime]);

  // Generate regime narrative (observational compression across time)
  const regimeNarrative = useMemo(() => {
    if (conceptualClusters.length < 2 && regime !== 'emergent') {
      return null;
    }

    const currentYear = new Date().getFullYear().toString();
    return generateRegimeNarrative({
      clusters: conceptualClusters,
      associations: clusterAssociations,
      regime,
      currentPeriod: currentYear,
    });
  }, [conceptualClusters, clusterAssociations, regime]);

  // Infer observer position within the field
  const observerPosition = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return inferObserverPosition({
      clusters: conceptualClusters,
      associations: clusterAssociations,
      regime,
      currentPeriod: currentYear,
    });
  }, [conceptualClusters, clusterAssociations, regime]);

  const handleExport = () => {
    window.print();
  };

  const handleGenerateSharePack = () => {
    if (!yearlyWrap || !address) return;

    // Determine year from reflections or use current year
    const year = reflections.length > 0
      ? new Date(reflections[0].createdAt).getFullYear()
      : new Date().getFullYear();

    // Generate SharePack
    const sharePack = generateSharePack(yearlyWrap, year, address);

    // Convert to JSON
    const json = JSON.stringify(sharePack, null, 2);

    // Create blob and download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `story-of-emergence-yearly-wrap-${year}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <YearlyWrapContainer>
        <h1 className="text-3xl font-normal text-gray-900 mb-12">Yearly Wrap</h1>
        <p className="text-gray-600">Loading reflections...</p>
      </YearlyWrapContainer>
    );
  }

  if (error) {
    return (
      <YearlyWrapContainer>
        <h1 className="text-3xl font-normal text-gray-900 mb-12">Yearly Wrap</h1>
        <div className="border border-red-200 bg-red-50 p-6 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </YearlyWrapContainer>
    );
  }

  if (!yearlyWrap) {
    return (
      <YearlyWrapContainer>
        <h1 className="text-3xl font-normal text-gray-900 mb-12">Yearly Wrap</h1>
        <div className="border border-gray-200 bg-gray-50 p-6 rounded">
          <p className="text-sm text-gray-600">
            Not enough data to generate a yearly wrap. Keep reflecting to see your year in review.
          </p>
        </div>
      </YearlyWrapContainer>
    );
  }

  return (
    <YearlyWrapContainer>
      {/* Export buttons - hidden in print */}
      <div className="mb-8 print:hidden flex gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-4 py-2 bg-white hover:bg-gray-50 transition-colors"
        >
          Export Yearly Wrap
        </button>
        {yearlyWrap && address && (
          <button
            type="button"
            onClick={handleGenerateSharePack}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-4 py-2 bg-white hover:bg-gray-50 transition-colors"
          >
            Generate Share Pack
          </button>
        )}
      </div>

      {/* Headline */}
      <div className="mb-16">
        <h1 className="text-4xl font-normal text-gray-900 mb-6 leading-tight">
          {yearlyWrap.headline}
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed max-w-[65ch]">
          {yearlyWrap.summary}
        </p>
      </div>

      {/* Density and Cadence Labels */}
      {(yearlyWrap.densityLabel || yearlyWrap.cadenceLabel) && (
        <div className="mb-16 flex gap-2 flex-wrap">
          {yearlyWrap.densityLabel && (
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
              {yearlyWrap.densityLabel.charAt(0).toUpperCase() + yearlyWrap.densityLabel.slice(1)} density
            </span>
          )}
          {yearlyWrap.cadenceLabel && (
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
              {yearlyWrap.cadenceLabel.charAt(0).toUpperCase() + yearlyWrap.cadenceLabel.slice(1)} cadence
            </span>
          )}
        </div>
      )}

      {/* Dominant Pattern */}
      {yearlyWrap.dominantPattern && (
        <div className="mb-16 pb-12 border-b border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Dominant Pattern</h3>
          <p className="text-base text-gray-800">{yearlyWrap.dominantPattern}</p>
        </div>
      )}

      {/* Key Moments */}
      {yearlyWrap.keyMoments.length > 0 && (
        <div className="mb-16">
          <h3 className="text-lg font-normal text-gray-900 mb-8">Key Moments</h3>
          <div className="space-y-8">
            {yearlyWrap.keyMoments.map((moment) => (
              <div key={moment.id} className="space-y-3">
                <h4 className="text-base font-medium text-gray-900">{moment.headline}</h4>
                {moment.label && (
                  <p className="text-xs text-gray-500">{moment.label}</p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed">{moment.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shifts */}
      {yearlyWrap.shifts.length > 0 && (
        <div className="mb-16 pt-12 border-t border-gray-200">
          <h3 className="text-sm font-normal text-gray-600 mb-6">Shifts</h3>
          <div className="space-y-4">
            {yearlyWrap.shifts.map((shift) => (
              <div key={shift.id} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 mt-0.5 shrink-0 text-base">
                  {shift.direction === 'intensifying' ? '↑' : 
                   shift.direction === 'stabilizing' ? '→' : 
                   shift.direction === 'fragmenting' ? '↯' : '—'}
                </span>
                <div className="flex-1">
                  <p className="font-normal text-gray-700 mb-1">{shift.headline}</p>
                  <p className="text-gray-600 leading-relaxed">{shift.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earlier echoes - Continuity note */}
      {continuityNote && (
        <div className="mb-16 pt-12 border-t border-gray-200">
          <h3 className="text-sm font-normal text-gray-600 mb-4">Earlier echoes</h3>
          <p className="text-base text-gray-700 leading-relaxed">
            {continuityNote.text}
          </p>
        </div>
      )}

      {/* Recurring regions - Conceptual clusters */}
      {conceptualClusters.length > 0 && (
        <div className="mb-16 pt-12 border-t border-gray-200">
          <h3 className="text-sm font-normal text-gray-600 mb-6">Recurring regions</h3>
          
          {/* Spatial layout - read-only projection */}
          {conceptualClusters.length >= 2 && (
            <div className="mb-8">
              <SpatialClusterLayout
                clusters={conceptualClusters}
                associations={clusterAssociations}
              />
            </div>
          )}

          {/* Continuations - conditional option space (only transitional/emergent) */}
          {continuations.length > 0 && (
            <div className="mb-8 pt-6 border-t border-gray-200">
              <div className="space-y-3">
                {continuations.map((continuation) => (
                  <p key={continuation.id} className="text-sm text-gray-600 italic leading-relaxed">
                    {continuation.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Regime narrative - observational compression across time */}
          {regimeNarrative && (
            <div className="mb-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 leading-relaxed">
                {regimeNarrative.text}
              </p>
              {/* Observer position - field position descriptor */}
              {observerPosition && (
                <p className="text-xs text-gray-500 mt-3 italic">
                  {observerPosition.phrase}
                </p>
              )}
            </div>
          )}

          {/* Observer position standalone (if narrative is null but position exists) */}
          {!regimeNarrative && observerPosition && (
            <div className="mb-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                {observerPosition.phrase}
              </p>
            </div>
          )}
          
          <div className="space-y-6">
            {conceptualClusters.map((cluster) => {
              const associations = getAssociationsForCluster(cluster.id, clusterAssociations, 2);
              return (
                <div key={cluster.id} className="text-base text-gray-700">
                  <p className="font-normal mb-1">{cluster.label}</p>
                  {cluster.faded && cluster.fadePhrase && (
                    <p className="text-xs text-gray-500 mb-1">• {cluster.fadePhrase}</p>
                  )}
                  {cluster.description && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-2">{cluster.description}</p>
                  )}
                  {associations.length > 0 && (
                    <div className="mt-3 ml-4 text-sm text-gray-600">
                      <p className="mb-2">Often appears alongside:</p>
                      <ul className="list-none space-y-1">
                        {associations.map((assoc) => {
                          const associatedClusterId = getAssociatedClusterId(assoc, cluster.id);
                          const associatedCluster = conceptualClusters.find(c => c.id === associatedClusterId);
                          if (!associatedCluster) return null;
                          
                          // Calculate distance for this association (with silence rules)
                          const currentYear = new Date().getFullYear().toString();
                          const distance = calculateClusterDistance(cluster, associatedCluster, {
                            allClusters: conceptualClusters,
                            currentPeriod: currentYear,
                          });
                          
                          // Only show distance if it passes silence rules
                          const distancePhrase = distance !== null ? getDistancePhrase(distance) : null;
                          
                          return (
                            <li key={assoc.fromClusterId + assoc.toClusterId} className="text-gray-600">
                              – {associatedCluster.label}
                              {distancePhrase && (
                                <span className="text-gray-500"> ({distancePhrase})</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </YearlyWrapContainer>
  );
}

