'use client';

/**
 * Yearly Wrap Assembly - Read-Only
 * 
 * Assembles yearly insights, narratives, deltas, density, and cadence
 * into a single coherent Yearly Wrap object.
 */

import { useEffect, useState, useMemo, useRef } from 'react';
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
import { generateYearlyContinuity, buildPriorYearWrap, type ContinuityNote } from '../../lib/continuity/continuity';
import type { ObservationClosure } from '../../lib/closure/inferObservationClosure';
import { generateConceptualClusters, generateClusterAssociations, getAssociationsForCluster, getAssociatedClusterId, calculateClusterDistance, getDistancePhrase, detectFadedClusters, type ConceptualCluster, type ClusterAssociation } from '../../lib/clusters/conceptualClusters';
import { SpatialClusterLayout } from '../../components/clusters/SpatialClusterLayout';
import { detectRegime } from '../../lib/regime/detectRegime';
import { stabilizeRegime, getStabilizedRegime, type StabilizedRegimeHistory } from '../../lib/regime/stabilizeRegime';
import { generateContinuations } from '../../lib/continuations/generateContinuations';
import { generateRegimeNarrative } from '../../lib/narrative/generateRegimeNarrative';
import { inferObserverPosition } from '../../lib/position/inferObserverPosition';
import { inferPositionalDrift } from '../../lib/position/inferPositionalDrift';
import { inferObservationClosure } from '../../lib/closure/inferObservationClosure';
import { inferObserverEnvironmentFeedback } from '../../lib/feedback/inferObserverEnvironmentFeedback';
import { getInitialConditions } from '../../lib/constraints/inferInitialConditions';
import { inferConstraintRelativeEmergence } from '../../lib/emergence/inferConstraintRelativeEmergence';
import { inferEmergencePersistence } from '../../lib/emergence/inferEmergencePersistence';
import { inferInterpretiveLoad } from '../../lib/load/inferInterpretiveLoad';
import { inferInterpretiveIrreversibility } from '../../lib/irreversibility/inferInterpretiveIrreversibility';
import { sealEpistemicBoundary } from '../../lib/boundary/sealEpistemicBoundary';
import { mapToViewModel, type FinalizedInferenceOutputs } from '../../representation';
import { witnessTemporalPatterns } from '../../lib/temporal';
import { TemporalWitnessView } from '../../components/temporal/TemporalWitnessView';
import { computeEntropicDecay, shouldSuppressMeaning, type EntropicDecayState } from '../../lib/decay';
import { computeSaturationCeiling, shouldSuppressDueToSaturation, type MeaningNode, type SaturationState } from '../../lib/saturation';
import { hasReinforcingNovelty } from '../../lib/novelty';
import { detectEmergenceRegime, trackRegimeDwellTime, type EmergenceRegime, type RegimeDwellState } from '../../lib/emergence';
import { buildStructuralLineage, encryptLineageGraph, saveLineageGraph, computeStructuralDistance, encryptDistanceMatrix, saveDistanceMatrix, buildNeighborhoodIndex, encryptNeighborhoodIndex, saveNeighborhoodIndex, computeStructuralDensity, encryptDensityMap, saveDensityMap, computeDensityGradient, encryptDensityGradient, saveDensityGradient, type StructuralLineageGraph } from '../../lib/lineage';
import type { Regime } from '../../lib/regime/detectRegime';
import type { FeedbackMode } from '../../lib/feedback/inferObserverEnvironmentFeedback';
import type { EmergenceSignal } from '../../lib/emergence/inferConstraintRelativeEmergence';
import type { EmergencePersistence } from '../../lib/emergence/inferEmergencePersistence';
import type { InterpretiveLoad } from '../../lib/load/inferInterpretiveLoad';
import type { InterpretiveIrreversibility } from '../../lib/irreversibility/inferInterpretiveIrreversibility';
import type { EpistemicBoundarySeal } from '../../lib/boundary/sealEpistemicBoundary';
import type { YearlyWrapViewModel } from '../../representation';

export default function YearlyWrapPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [sessionStart, setSessionStart] = useState<string | null>(null);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track session start (for entropic decay and regime dwell time)
  // Session-scoped: resets on new wallet session
  useEffect(() => {
    if (connected && address) {
      // New session - reset session start, decay state, and dwell state
      setSessionStart(new Date().toISOString());
      previousDecayStateRef.current = null;
      previousDwellStateRef.current = null;
    } else {
      // Disconnected - clear session start, decay state, and dwell state
      setSessionStart(null);
      previousDecayStateRef.current = null;
      previousDwellStateRef.current = null;
    }
  }, [connected, address]);

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

  // Infer initial conditions (computed once per wallet session, cached)
  // Initial conditions anchor all observation relative to constraint, not freedom
  const initialConditions = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0 || !address) {
      return null;
    }

    // Generate clusters for initial conditions inference
    const allClusters = generateConceptualClusters(reflections, yearlyWrap);
    const currentYear = new Date().getFullYear().toString();
    const allAssociations = allClusters.length >= 2
      ? generateClusterAssociations(allClusters, currentYear)
      : [];

    return getInitialConditions(address, {
      reflections,
      clusters: allClusters,
      associations: allAssociations,
    });
  }, [yearlyWrap, reflections, address]);

  // Build period data for regime stabilization
  const periodDataForStabilization = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0) {
      return [];
    }

    const currentYear = new Date().getFullYear();
    const periods: Array<{
      period: string;
      clusters: ReturnType<typeof generateConceptualClusters>;
      associations: ReturnType<typeof generateClusterAssociations>;
    }> = [];

    // Collect data for current year and up to 3 previous years
    for (let yearOffset = 0; yearOffset <= 3; yearOffset++) {
      const year = currentYear - yearOffset;
      const yearWrap = yearOffset === 0
        ? yearlyWrap
        : buildPriorYearWrap(reflections, year);

      if (!yearWrap) {
        continue;
      }

      const clusters = generateConceptualClusters(reflections, yearWrap);
      const yearStr = year.toString();
      const associations = clusters.length >= 2
        ? generateClusterAssociations(clusters, yearStr)
        : [];

      periods.push({
        period: yearStr,
        clusters,
        associations,
      });
    }

    return periods;
  }, [yearlyWrap, reflections]);

  // Compute raw regimes for all periods (needed for closure and stabilization)
  // Reference initial conditions to modulate thresholds
  const rawRegimesForPeriods = useMemo(() => {
    const regimes = new Map<string, Regime>();
    
    for (const pd of periodDataForStabilization) {
      const rawRegime = detectRegime({
        clusters: pd.clusters,
        associations: pd.associations,
        currentPeriod: pd.period,
        initialConditions,
      });
      regimes.set(pd.period, rawRegime);
    }
    
    return regimes;
  }, [periodDataForStabilization, initialConditions]);

  // Compute previous period data using raw regime (for closure detection)
  const previousPeriodDataForClosure = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0) {
      return { regime: null as Regime | null, position: null };
    }

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const previousYearStr = previousYear.toString();

    const previousRawRegime = rawRegimesForPeriods.get(previousYearStr);
    if (!previousRawRegime) {
      return { regime: null, position: null };
    }

    // Build previous year's wrap
    const priorYearWrap = buildPriorYearWrap(reflections, previousYear);
    if (!priorYearWrap) {
      return { regime: null, position: null };
    }

    // Generate previous year's clusters
    const previousClusters = generateConceptualClusters(reflections, priorYearWrap);
    const previousAssociations = previousClusters.length >= 2
      ? generateClusterAssociations(previousClusters, previousYearStr)
      : [];

    // Infer previous position (using raw regime for closure detection)
    const previousPosition = inferObserverPosition({
      clusters: previousClusters,
      associations: previousAssociations,
      regime: previousRawRegime,
      currentPeriod: previousYearStr,
    });

    return { regime: previousRawRegime, position: previousPosition };
  }, [yearlyWrap, reflections, rawRegimesForPeriods]);

  // Generate conceptual clusters for current period (needed for closure detection)
  const currentPeriodClusters = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0) {
      return [];
    }
    return generateConceptualClusters(reflections, yearlyWrap);
  }, [yearlyWrap, reflections]);

  const currentPeriodAssociations = useMemo(() => {
    if (currentPeriodClusters.length < 2) {
      return [];
    }
    const currentYear = new Date().getFullYear().toString();
    return generateClusterAssociations(currentPeriodClusters, currentYear);
  }, [currentPeriodClusters]);

  // Get raw regime for current period
  const currentPeriodRawRegime = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return rawRegimesForPeriods.get(currentYear) || 'deterministic';
  }, [rawRegimesForPeriods]);

  // Infer observer position for closure detection
  const observerPositionForClosure = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return inferObserverPosition({
      clusters: currentPeriodClusters,
      associations: currentPeriodAssociations,
      regime: currentPeriodRawRegime,
      currentPeriod: currentYear,
    });
  }, [currentPeriodClusters, currentPeriodAssociations, currentPeriodRawRegime]);

  // Compute positional drift for closure detection
  const positionalDriftForClosure = useMemo(() => {
    if (!previousPeriodDataForClosure.position || !observerPositionForClosure) {
      return null;
    }
    return inferPositionalDrift({
      previous: previousPeriodDataForClosure.position,
      current: observerPositionForClosure,
      previousRegime: previousPeriodDataForClosure.regime!,
      currentRegime: currentPeriodRawRegime,
    });
  }, [previousPeriodDataForClosure, observerPositionForClosure, currentPeriodRawRegime]);

  // Compute continuations for closure detection
  const continuationsForClosure = useMemo(() => {
    if (currentPeriodClusters.length < 2) {
      return [];
    }
    const currentYear = new Date().getFullYear().toString();
    return generateContinuations({
      clusters: currentPeriodClusters,
      associations: currentPeriodAssociations,
      regime: currentPeriodRawRegime,
      currentPeriod: currentYear,
    });
  }, [currentPeriodClusters, currentPeriodAssociations, currentPeriodRawRegime]);

  // Infer closure for current period
  const currentPeriodClosure = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return inferObservationClosure({
      regime: currentPeriodRawRegime,
      clusters: currentPeriodClusters,
      associations: currentPeriodAssociations,
      currentPeriod: currentYear,
      positionalDrift: positionalDriftForClosure,
      continuations: continuationsForClosure,
      observerPosition: observerPositionForClosure,
    });
  }, [
    currentPeriodRawRegime,
    currentPeriodClusters,
    currentPeriodAssociations,
    positionalDriftForClosure,
    continuationsForClosure,
    observerPositionForClosure,
  ]);

  // Stabilize regimes across periods (with hysteresis and persistence)
  // Include closure data to prevent regime changes when closed
  const stabilizedRegimeHistory = useMemo(() => {
    if (periodDataForStabilization.length === 0) {
      return [];
    }

    const currentYear = new Date().getFullYear().toString();

    // Build period data with closure
    const periodsWithClosure = periodDataForStabilization.map(pd => ({
      period: pd.period,
      clusters: pd.clusters,
      associations: pd.associations,
      closure: pd.period === currentYear ? currentPeriodClosure : undefined,
    }));

    return stabilizeRegime(periodsWithClosure);
  }, [periodDataForStabilization, currentPeriodClosure]);

  // Get stabilized regime for current period
  const stabilizedRegime = useMemo(() => {
    if (stabilizedRegimeHistory.length === 0) {
      return 'deterministic' as const;
    }

    const currentYear = new Date().getFullYear().toString();
    return getStabilizedRegime(currentYear, stabilizedRegimeHistory) || 'deterministic';
  }, [stabilizedRegimeHistory]);

  // Detect previous period's regime and position for drift comparison (using stabilized regime)
  const previousPeriodData = useMemo(() => {
    if (!yearlyWrap || reflections.length === 0 || stabilizedRegimeHistory.length === 0) {
      return { regime: null as Regime | null, position: null };
    }

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const previousYearStr = previousYear.toString();

    // Get stabilized regime for previous period
    const previousStabilizedRegime = getStabilizedRegime(previousYearStr, stabilizedRegimeHistory);
    if (!previousStabilizedRegime) {
      return { regime: null, position: null };
    }

    // Build previous year's wrap
    const priorYearWrap = buildPriorYearWrap(reflections, previousYear);
    if (!priorYearWrap) {
      return { regime: null, position: null };
    }

    // Generate previous year's clusters
    const previousClusters = generateConceptualClusters(reflections, priorYearWrap);
    const previousAssociations = previousClusters.length >= 2
      ? generateClusterAssociations(previousClusters, previousYearStr)
      : [];

    // Infer previous position (using stabilized regime)
    const previousPosition = inferObserverPosition({
      clusters: previousClusters,
      associations: previousAssociations,
      regime: previousStabilizedRegime,
      currentPeriod: previousYearStr,
    });

    return { regime: previousStabilizedRegime, position: previousPosition };
  }, [yearlyWrap, reflections, stabilizedRegimeHistory]);

  // Use stabilized regime for gating (internal only, never rendered)
  const regime = stabilizedRegime;

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

  // Infer positional drift across periods
  const positionalDrift = useMemo(() => {
    if (!previousPeriodData.position || !observerPosition) {
      return null;
    }

    return inferPositionalDrift({
      previous: previousPeriodData.position,
      current: observerPosition,
      previousRegime: previousPeriodData.regime!,
      currentRegime: regime,
    });
  }, [previousPeriodData, observerPosition, regime]);

  // Infer observation closure (determines if period is frozen)
  const observationClosure = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return inferObservationClosure({
      regime,
      clusters: conceptualClusters,
      associations: clusterAssociations,
      currentPeriod: currentYear,
      positionalDrift,
      continuations,
      observerPosition,
    });
  }, [regime, conceptualClusters, clusterAssociations, positionalDrift, continuations, observerPosition]);

  // Infer observer-environment feedback mode (internal only, gates interpretation density)
  // Stabilized against initial conditions
  const feedbackMode = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return inferObserverEnvironmentFeedback({
      regime,
      clusters: conceptualClusters,
      associations: clusterAssociations,
      currentPeriod: currentYear,
      continuityNote,
      closure: observationClosure,
      positionalDrift,
      initialConditions,
    });
  }, [regime, conceptualClusters, clusterAssociations, continuityNote, observationClosure, positionalDrift, initialConditions]);

  // Infer constraint-relative emergence signal (internal only)
  // Gates downstream behavior: multiplicity, narrative compression, asymmetry emphasis
  const emergenceSignal = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    
    // Build previous periods data for persistence check
    const previousPeriodsData: Array<{
      clusters: ConceptualCluster[];
      associations: ClusterAssociation[];
    }> = [];
    
    const currentYearNum = new Date().getFullYear();
    for (let yearOffset = 1; yearOffset <= 2; yearOffset++) {
      const year = currentYearNum - yearOffset;
      const yearWrap = buildPriorYearWrap(reflections, year);
      if (yearWrap) {
        const prevClusters = generateConceptualClusters(reflections, yearWrap);
        const prevAssociations = prevClusters.length >= 2
          ? generateClusterAssociations(prevClusters, year.toString())
          : [];
        previousPeriodsData.push({
          clusters: prevClusters,
          associations: prevAssociations,
        });
      }
    }

    return inferConstraintRelativeEmergence({
      initialConditions,
      regime,
      clusters: conceptualClusters,
      associations: clusterAssociations,
      currentPeriod: currentYear,
      continuityNote,
      closure: observationClosure,
      positionalDrift,
      feedbackMode,
      previousPeriods: previousPeriodsData.length > 0 ? previousPeriodsData : undefined,
    });
  }, [
    initialConditions,
    regime,
    conceptualClusters,
    clusterAssociations,
    continuityNote,
    observationClosure,
    positionalDrift,
    feedbackMode,
    reflections,
  ]);

  // Infer emergence persistence and collapse (internal only)
  // Tracks whether emergence remains valid across periods or has collapsed
  const emergencePersistence = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const currentYearNum = new Date().getFullYear();

    // Compute previous emergence signals for persistence check
    const previousPeriodsEmergenceData: Array<{
      emergence: EmergenceSignal;
      regime: Regime;
      continuityNote: ContinuityNote | null;
      closure: ObservationClosure;
      clusters: ConceptualCluster[];
      associations: ClusterAssociation[];
    }> = [];

    let previousEmergence: EmergenceSignal | null = null;

    for (let yearOffset = 1; yearOffset <= 2; yearOffset++) {
      const year = currentYearNum - yearOffset;
      const yearStr = year.toString();
      const yearWrap = buildPriorYearWrap(reflections, year);
      
      if (!yearWrap) {
        continue;
      }

      const prevClusters = generateConceptualClusters(reflections, yearWrap);
      const prevAssociations = prevClusters.length >= 2
        ? generateClusterAssociations(prevClusters, yearStr)
        : [];

      // Compute previous period's emergence signal
      const prevRawRegime = rawRegimesForPeriods.get(yearStr) || 'deterministic';
      const prevContinuity = yearOffset === 1 
        ? generateYearlyContinuity(yearWrap, buildPriorYearWrap(reflections, year - 1))
        : null;
      
      // Compute previous feedback mode (simplified - would need full computation)
      const prevFeedbackMode: FeedbackMode = prevRawRegime === 'deterministic' 
        ? 'ENVIRONMENT_DOMINANT'
        : 'COUPLED';

      const prevEmergence = inferConstraintRelativeEmergence({
        initialConditions,
        regime: prevRawRegime,
        clusters: prevClusters,
        associations: prevAssociations,
        currentPeriod: yearStr,
        continuityNote: prevContinuity,
        closure: 'open', // Assume open for previous periods
        positionalDrift: null, // Would need to compute
        feedbackMode: prevFeedbackMode,
        previousPeriods: undefined,
      });

      if (yearOffset === 1) {
        previousEmergence = prevEmergence;
      }

      previousPeriodsEmergenceData.push({
        emergence: prevEmergence,
        regime: prevRawRegime,
        continuityNote: prevContinuity,
        closure: 'open',
        clusters: prevClusters,
        associations: prevAssociations,
      });
    }

    return inferEmergencePersistence({
      currentEmergence: emergenceSignal,
      previousEmergence,
      regime,
      clusters: conceptualClusters,
      associations: clusterAssociations,
      currentPeriod: currentYear,
      continuityNote,
      closure: observationClosure,
      feedbackMode,
      initialConditions,
      previousPeriods: previousPeriodsEmergenceData.length > 0 ? previousPeriodsEmergenceData : undefined,
    });
  }, [
    emergenceSignal,
    regime,
    conceptualClusters,
    clusterAssociations,
    continuityNote,
    observationClosure,
    feedbackMode,
    initialConditions,
    rawRegimesForPeriods,
    reflections,
  ]);

  // Calculate structural deviation magnitude for load regulation
  const structuralDeviationMagnitude = useMemo(() => {
    if (!initialConditions || conceptualClusters.length === 0) {
      return 0;
    }

    const { constraintDensity, authorityConcentration } = initialConditions;

    let expectedClusterCount = 3;
    if (constraintDensity === 'high') {
      expectedClusterCount = 2;
    } else if (constraintDensity === 'low') {
      expectedClusterCount = 4;
    }

    let expectedAssociationDensity = 0.3;
    if (authorityConcentration === 'high') {
      expectedAssociationDensity = 0.6;
    } else if (authorityConcentration === 'low') {
      expectedAssociationDensity = 0.2;
    }

    const clusterCount = conceptualClusters.length;
    const clustersWithAssociations = new Set<string>();
    clusterAssociations.forEach(a => {
      clustersWithAssociations.add(a.fromClusterId);
      clustersWithAssociations.add(a.toClusterId);
    });
    const associationDensity = clusterCount > 0
      ? clustersWithAssociations.size / clusterCount
      : 0;

    const clusterDeviationRatio = Math.abs(clusterCount - expectedClusterCount) / Math.max(expectedClusterCount, 1);
    const associationDeviationRatio = Math.abs(associationDensity - expectedAssociationDensity) / Math.max(expectedAssociationDensity, 0.1);

    return Math.max(clusterDeviationRatio, associationDeviationRatio);
  }, [conceptualClusters, clusterAssociations, initialConditions]);

  // Infer interpretive load regulation (internal only)
  // Regulates how much meaning is allowed to surface, even when emergence is persistent
  const interpretiveLoad = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const currentYearNum = new Date().getFullYear();

    // Compute previous load for persistence check
    // Try to compute previous period's load (simplified - would need full computation)
    // For now, we'll use null to indicate no previous load
    // In a full implementation, we'd compute this from previous periods
    const previousLoad: InterpretiveLoad | null = null;

    return inferInterpretiveLoad({
      emergencePersistence,
      structuralDeviationMagnitude,
      continuityNote,
      initialConditions,
      feedbackMode,
      regime,
      closure: observationClosure,
      clusters: conceptualClusters,
      associations: clusterAssociations,
      previousLoad,
    });
  }, [
    emergencePersistence,
    structuralDeviationMagnitude,
    continuityNote,
    initialConditions,
    feedbackMode,
    regime,
    observationClosure,
    conceptualClusters,
    clusterAssociations,
  ]);

  // Infer interpretive irreversibility and memory lock (internal only)
  // Ensures that once meaning collapses or is suppressed, it cannot be reintroduced
  // without genuinely stronger evidence. This prevents retroactive reinterpretation.
  const interpretiveIrreversibility = useMemo(() => {
    const currentYearNum = new Date().getFullYear();

    // Compute previous periods' collapse history for irreversibility check
    const previousPeriodsData: Array<{
      persistence: EmergencePersistence;
      load: InterpretiveLoad;
      regime: Regime;
      closure: ObservationClosure;
    }> = [];

    // Track if we have any previous period data (determines if this is a "new session")
    let hasPreviousData = false;

    for (let yearOffset = 1; yearOffset <= 2; yearOffset++) {
      const year = currentYearNum - yearOffset;
      const yearStr = year.toString();
      const yearWrap = buildPriorYearWrap(reflections, year);
      
      if (!yearWrap) {
        continue;
      }

      hasPreviousData = true;

      const prevClusters = generateConceptualClusters(reflections, yearWrap);
      const prevAssociations = prevClusters.length >= 2
        ? generateClusterAssociations(prevClusters, yearStr)
        : [];

      // Compute previous period's signals (simplified - would need full computation)
      const prevRawRegime = rawRegimesForPeriods.get(yearStr) || 'deterministic';
      const prevContinuity = yearOffset === 1 
        ? generateYearlyContinuity(yearWrap, buildPriorYearWrap(reflections, year - 1))
        : null;
      
      // Compute previous emergence persistence (simplified)
      const prevFeedbackMode: FeedbackMode = prevRawRegime === 'deterministic' 
        ? 'ENVIRONMENT_DOMINANT'
        : 'COUPLED';

      const prevEmergence = inferConstraintRelativeEmergence({
        initialConditions,
        regime: prevRawRegime,
        clusters: prevClusters,
        associations: prevAssociations,
        currentPeriod: yearStr,
        continuityNote: prevContinuity,
        closure: 'open', // Assume open for previous periods
        positionalDrift: null,
        feedbackMode: prevFeedbackMode,
        previousPeriods: undefined,
      });

      const prevPersistence = inferEmergencePersistence({
        currentEmergence: prevEmergence,
        previousEmergence: null, // Simplified
        regime: prevRawRegime,
        clusters: prevClusters,
        associations: prevAssociations,
        currentPeriod: yearStr,
        continuityNote: prevContinuity,
        closure: 'open',
        feedbackMode: prevFeedbackMode,
        initialConditions,
        previousPeriods: undefined,
      });

      const prevLoad = inferInterpretiveLoad({
        emergencePersistence: prevPersistence,
        structuralDeviationMagnitude: 0, // Simplified
        continuityNote: prevContinuity,
        initialConditions,
        feedbackMode: prevFeedbackMode,
        regime: prevRawRegime,
        closure: 'open',
        clusters: prevClusters,
        associations: prevAssociations,
        previousLoad: null,
      });

      previousPeriodsData.push({
        persistence: prevPersistence,
        load: prevLoad,
        regime: prevRawRegime,
        closure: 'open', // Simplified
      });
    }

    // Determine if this is a new session (no previous data = new session)
    const isNewSession = !hasPreviousData;

    return inferInterpretiveIrreversibility({
      currentLoad: interpretiveLoad,
      currentPersistence: emergencePersistence,
      regime,
      closure: observationClosure,
      feedbackMode,
      structuralDeviationMagnitude,
      continuityNote,
      previousPeriods: previousPeriodsData.length > 0 ? previousPeriodsData : undefined,
      isNewSession,
    });
  }, [
    interpretiveLoad,
    emergencePersistence,
    regime,
    observationClosure,
    feedbackMode,
    structuralDeviationMagnitude,
    continuityNote,
    initialConditions,
    rawRegimesForPeriods,
    reflections,
  ]);

  // Seal epistemic boundary and close inference system (final closure layer)
  // Prevents downstream logic from adding new interpretive dimensions
  // Freezes the inferential graph
  const epistemicBoundarySeal = useMemo(() => {
    // Compute previous seal for session persistence
    // In a full implementation, this would be tracked across periods
    // For now, we'll compute it from previous periods' data
    const previousSeal: EpistemicBoundarySeal | null = null;

    // Determine if this is a new session (no previous data = new session)
    const currentYearNum = new Date().getFullYear();
    let hasPreviousData = false;
    for (let yearOffset = 1; yearOffset <= 2; yearOffset++) {
      const year = currentYearNum - yearOffset;
      const yearWrap = buildPriorYearWrap(reflections, year);
      if (yearWrap) {
        hasPreviousData = true;
        break;
      }
    }
    const isNewSession = !hasPreviousData;

    return sealEpistemicBoundary({
      regime,
      closure: observationClosure,
      irreversibility: interpretiveIrreversibility,
      load: interpretiveLoad,
      persistence: emergencePersistence,
      initialConditions,
      isNewSession,
      previousSeal,
    });
  }, [
    regime,
    observationClosure,
    interpretiveIrreversibility,
    interpretiveLoad,
    emergencePersistence,
    initialConditions,
    reflections,
  ]);

  // Entropic decay - meaning decays over time unless reinforced by novel reflections
  // Only genuine new reflections (exceeding novelty threshold) can reinforce meaning
  // Deterministic: same reflections + same time → same decay factor
  // Session-scoped: decay resets on new wallet session
  const previousDecayStateRef = useRef<EntropicDecayState | null>(null);
  
  // Regime dwell time tracking - read-only metric
  // Tracks how long system remains within current regime
  // Session-scoped: resets on new wallet session
  const previousDwellStateRef = useRef<RegimeDwellState | null>(null);
  
  const entropicDecayState = useMemo(() => {
    if (!sessionStart || reflections.length === 0) {
      // No session or no reflections = complete decay
      const state = {
        decayFactor: 0,
        isDecayed: true,
        timeSinceLastReinforcement: 0,
        sessionStart: sessionStart || new Date().toISOString(),
        lastNovelReflectionTime: 0,
      };
      previousDecayStateRef.current = state;
      return state;
    }

    const state = computeEntropicDecay({
      reflections,
      sessionStart,
      currentTime: new Date().toISOString(),
      previousDecayState: previousDecayStateRef.current,
    });
    
    previousDecayStateRef.current = state;
    return state;
  }, [reflections, sessionStart]);

  // Emergence saturation ceiling - enforce hard cap on concurrent meaning
  // Prevents runaway emergence, over-interpretation, or conceptual inflation
  // Deterministic: same reflections → same saturation outcome
  const saturationState = useMemo(() => {
    if (shouldSuppressMeaning(entropicDecayState)) {
      // If decay has collapsed meaning, saturation is irrelevant
      return {
        activeNodes: [],
        saturated: false,
        displacedNodes: [],
      };
    }

    // Collect all candidate meaning nodes
    const candidateNodes: MeaningNode[] = [];

    // Add narrative fragment if present
    if (regimeNarrative) {
      // Compute novelty for narrative (based on most recent reflection)
      const mostRecentReflection = reflections.length > 0
        ? reflections[reflections.length - 1]
        : null;
      const priorReflections = reflections.slice(0, -1);
      const novelty = mostRecentReflection && priorReflections.length > 0
        ? hasReinforcingNovelty([mostRecentReflection], priorReflections) ? 0.7 : 0.3
        : 1.0; // First reflection = full novelty

      candidateNodes.push({
        id: regimeNarrative.id,
        type: 'narrative',
        strength: entropicDecayState.decayFactor, // Decay-adjusted strength
        novelty,
        persistence: 0.5, // Default persistence (can be refined)
        createdAt: reflections.length > 0
          ? reflections[reflections.length - 1].createdAt
          : new Date().toISOString(),
        priority: 0, // Will be computed
      });
    }

    // Add continuations
    continuations.forEach(continuation => {
      const mostRecentReflection = reflections.length > 0
        ? reflections[reflections.length - 1]
        : null;
      const priorReflections = reflections.slice(0, -1);
      const novelty = mostRecentReflection && priorReflections.length > 0
        ? hasReinforcingNovelty([mostRecentReflection], priorReflections) ? 0.7 : 0.3
        : 1.0;

      candidateNodes.push({
        id: continuation.id,
        type: 'continuation',
        strength: entropicDecayState.decayFactor * 0.8, // Continuations slightly weaker than narrative
        novelty,
        persistence: 0.3, // Lower persistence for continuations
        createdAt: reflections.length > 0
          ? reflections[reflections.length - 1].createdAt
          : new Date().toISOString(),
        priority: 0, // Will be computed
      });
    });

    // Add conceptual clusters (as meaning nodes)
    conceptualClusters.forEach(cluster => {
      candidateNodes.push({
        id: cluster.id,
        type: 'cluster',
        strength: entropicDecayState.decayFactor * 0.6, // Clusters weaker than narrative/continuations
        novelty: cluster.sourcePeriods.length > 1 ? 0.2 : 0.8, // Recurring = lower novelty
        persistence: Math.min(1, cluster.sourcePeriods.length / 3), // Persistence based on period count
        createdAt: cluster.sourcePeriods.length > 0
          ? `${cluster.sourcePeriods[0]}-01-01T00:00:00Z` // Approximate from first period
          : new Date().toISOString(),
        priority: 0, // Will be computed
      });
    });

    // Add observer position if present
    if (observerPosition) {
      candidateNodes.push({
        id: `position-${observerPosition.phrase.slice(0, 20)}`,
        type: 'position',
        strength: entropicDecayState.decayFactor * 0.5, // Position weaker than narrative
        novelty: 0.4, // Position has moderate novelty
        persistence: 0.4,
        createdAt: reflections.length > 0
          ? reflections[reflections.length - 1].createdAt
          : new Date().toISOString(),
        priority: 0, // Will be computed
      });
    }

    // Add positional drift if present
    if (positionalDrift) {
      candidateNodes.push({
        id: `drift-${positionalDrift.phrase.slice(0, 20)}`,
        type: 'drift',
        strength: entropicDecayState.decayFactor * 0.4, // Drift weakest
        novelty: 0.5, // Drift has moderate novelty
        persistence: 0.2, // Drift has low persistence
        createdAt: reflections.length > 0
          ? reflections[reflections.length - 1].createdAt
          : new Date().toISOString(),
        priority: 0, // Will be computed
      });
    }

    // Compute saturation ceiling
    return computeSaturationCeiling({
      candidateNodes,
      maxConcurrentMeaning: 8, // Hard ceiling: max 8 concurrent meaning nodes
      currentTime: new Date().toISOString(),
    });
  }, [
    entropicDecayState,
    regimeNarrative,
    continuations,
    conceptualClusters,
    observerPosition,
    positionalDrift,
    reflections,
  ]);

  // Emergence phase transition detection - read-only regime classification
  // Classifies system state (silence-dominant, sparse-meaning, dense-meaning)
  // Does not influence inference, decay, novelty, or saturation
  // Deterministic: same active node count → same regime
  const emergenceRegime = useMemo(() => {
    // Count active meaning nodes after saturation filtering
    const activeNodeCount = saturationState.activeNodes.length;
    
    return detectEmergenceRegime({
      activeMeaningNodeCount: activeNodeCount,
    });
  }, [saturationState]);

  // Regime dwell time tracking - read-only metric
  // Tracks how long system remains within current regime
  // Does not influence inference, decay, novelty, saturation, collapse, or regime classification
  // Session-scoped: resets on new wallet session
  const regimeDwellState = useMemo(() => {
    if (!sessionStart) {
      // No session - return empty state
      return {
        currentRegime: emergenceRegime,
        entryTimestamp: new Date().toISOString(),
        sessionStart: new Date().toISOString(),
        dwellDurationMs: 0,
      };
    }

    return trackRegimeDwellTime({
      currentRegime: emergenceRegime,
      sessionStart,
      currentTime: new Date().toISOString(),
      previousDwellState: previousDwellStateRef.current,
    });
  }, [emergenceRegime, sessionStart]);

  // Update ref for next computation
  useEffect(() => {
    previousDwellStateRef.current = regimeDwellState;
  }, [regimeDwellState]);

  // Structural lineage graph - read-only, encrypted
  // Records how reflections relate to one another structurally
  // Does not influence inference, decay, novelty, saturation, regime, or dwell time
  // Session-scoped: recomputed per wallet session
  const structuralLineageGraph = useMemo(() => {
    if (!sessionStart || reflections.length === 0 || !address) {
      return null;
    }

    // Generate session ID from session start timestamp
    const sessionId = `session_${new Date(sessionStart).getTime()}`;

    // Build structural lineage graph
    return buildStructuralLineage({
      reflections,
      sessionId,
      divergenceThreshold: 0.2, // Minimum divergence to create link
    });
  }, [reflections, sessionStart, address]);

  // Structural distance matrix - read-only, encrypted
  // Measures how far apart reflections are in structural space
  // Does not influence inference, decay, novelty, saturation, regime, or dwell time
  // Session-scoped: computed per wallet session
  const structuralDistanceMatrix = useMemo(() => {
    if (!structuralLineageGraph) {
      return null;
    }

    // Compute structural distance matrix from lineage graph
    return computeStructuralDistance({
      lineageGraph: structuralLineageGraph,
      sessionId: structuralLineageGraph.sessionId,
    });
  }, [structuralLineageGraph]);

  // Encrypt and store lineage graph (async, non-blocking)
  useEffect(() => {
    if (!structuralLineageGraph || !address || !sessionKey) {
      return;
    }

    // Encrypt and store asynchronously (doesn't block rendering)
    (async () => {
      try {
        const encrypted = await encryptLineageGraph(structuralLineageGraph, sessionKey);
        const sessionId = structuralLineageGraph.sessionId;
        saveLineageGraph(address, sessionId, encrypted);
      } catch (err) {
        console.error('Failed to encrypt and store lineage graph', err);
      }
    })();
  }, [structuralLineageGraph, address, sessionKey]);

  // Encrypt and store distance matrix (async, non-blocking)
  useEffect(() => {
    if (!structuralDistanceMatrix || !address || !sessionKey) {
      return;
    }

    // Encrypt and store asynchronously (doesn't block rendering)
    (async () => {
      try {
        const encrypted = await encryptDistanceMatrix(structuralDistanceMatrix, sessionKey);
        const sessionId = structuralDistanceMatrix.sessionId;
        saveDistanceMatrix(address, sessionId, encrypted);
      } catch (err) {
        console.error('Failed to encrypt and store distance matrix', err);
      }
    })();
  }, [structuralDistanceMatrix, address, sessionKey]);

  // Structural neighborhood index - read-only, encrypted
  // Identifies which reflections exist within a local structural vicinity
  // Does not influence inference, decay, novelty, saturation, regime, or dwell time
  // Session-scoped: computed per wallet session
  const structuralNeighborhoodIndex = useMemo(() => {
    if (!structuralDistanceMatrix) {
      return null;
    }

    // Build neighborhood index from distance matrix
    return buildNeighborhoodIndex({
      distanceMatrix: structuralDistanceMatrix,
      distanceThreshold: 0.5, // Fixed internal constant D
      sessionId: structuralDistanceMatrix.sessionId,
    });
  }, [structuralDistanceMatrix]);

  // Encrypt and store neighborhood index (async, non-blocking)
  useEffect(() => {
    if (!structuralNeighborhoodIndex || !address || !sessionKey) {
      return;
    }

    // Encrypt and store asynchronously (doesn't block rendering)
    (async () => {
      try {
        const encrypted = await encryptNeighborhoodIndex(structuralNeighborhoodIndex, sessionKey);
        const sessionId = structuralNeighborhoodIndex.sessionId;
        saveNeighborhoodIndex(address, sessionId, encrypted);
      } catch (err) {
        console.error('Failed to encrypt and store neighborhood index', err);
      }
    })();
  }, [structuralNeighborhoodIndex, address, sessionKey]);

  // Structural density map - read-only, encrypted
  // Measures how locally crowded a reflection's neighborhood is
  // Does not influence meaning reinforcement, decay, novelty, saturation, regime, dwell time, distance, or neighborhood membership
  // Session-scoped: computed per wallet session
  const structuralDensityMap = useMemo(() => {
    if (!structuralNeighborhoodIndex) {
      return null;
    }

    // Compute density map from neighborhood index
    // Density = size of neighborhood (absolute count)
    return computeStructuralDensity({
      neighborhoodIndex: structuralNeighborhoodIndex,
      sessionId: structuralNeighborhoodIndex.sessionId,
    });
  }, [structuralNeighborhoodIndex]);

  // Encrypt and store density map (async, non-blocking)
  useEffect(() => {
    if (!structuralDensityMap || !address || !sessionKey) {
      return;
    }

    // Encrypt and store asynchronously (doesn't block rendering)
    (async () => {
      try {
        const encrypted = await encryptDensityMap(structuralDensityMap, sessionKey);
        const sessionId = structuralDensityMap.sessionId;
        saveDensityMap(address, sessionId, encrypted);
      } catch (err) {
        console.error('Failed to encrypt and store density map', err);
      }
    })();
  }, [structuralDensityMap, address, sessionKey]);

  // Structural density gradient - read-only, encrypted
  // Captures how density changes across adjacent neighborhoods
  // Does not influence meaning reinforcement, decay, novelty, saturation, regime, dwell time, distance, neighborhood membership, or density itself
  // Session-scoped: computed per wallet session
  const structuralDensityGradient = useMemo(() => {
    if (!structuralNeighborhoodIndex || !structuralDensityMap) {
      return null;
    }

    // Compute gradient from neighborhood index and density map
    // Gradient represents magnitude of density difference only (non-directional)
    return computeDensityGradient({
      neighborhoodIndex: structuralNeighborhoodIndex,
      densityMap: structuralDensityMap,
      sessionId: structuralDensityMap.sessionId,
    });
  }, [structuralNeighborhoodIndex, structuralDensityMap]);

  // Encrypt and store density gradient (async, non-blocking)
  useEffect(() => {
    if (!structuralDensityGradient || !address || !sessionKey) {
      return;
    }

    // Encrypt and store asynchronously (doesn't block rendering)
    (async () => {
      try {
        const encrypted = await encryptDensityGradient(structuralDensityGradient, sessionKey);
        const sessionId = structuralDensityGradient.sessionId;
        saveDensityGradient(address, sessionId, encrypted);
      } catch (err) {
        console.error('Failed to encrypt and store density gradient', err);
      }
    })();
  }, [structuralDensityGradient, address, sessionKey]);

  // Apply feedback mode, emergence signal, persistence, load, irreversibility, epistemic boundary, entropic decay, and saturation gating
  // Epistemic boundary seal: final closure layer that prevents new inference paths
  // When epistemicallyClosed is true: all narrative generation paths disabled
  const effectiveRegimeNarrative = useMemo(() => {
    // Saturation gate: suppress if displaced by saturation ceiling
    if (regimeNarrative && shouldSuppressDueToSaturation(regimeNarrative.id, saturationState)) {
      return null;
    }

    // Epistemic boundary gate: when closed, all narrative generation paths are disabled
    if (epistemicBoundarySeal.epistemicallyClosed) {
      return null;
    }
    
    if (observationClosure === 'closed') {
      return null;
    }
    
    // Irreversibility gate: locked suppresses all narrative
    if (interpretiveIrreversibility === 'locked') {
      return null;
    }
    
    // Irreversibility gate: hardened requires extreme evidence
    if (interpretiveIrreversibility === 'hardened') {
      // Hardened allows interpretation only under extreme evidence:
      // - Persistent emergence
      // - Very high structural deviation (>0.6)
      // - Strong continuity
      // - Observer-dominant feedback
      // - Non-minimal load
      if (emergencePersistence === 'persistent' &&
          structuralDeviationMagnitude > 0.6 &&
          continuityNote !== null &&
          feedbackMode === 'OBSERVER_DOMINANT' &&
          interpretiveLoad !== 'minimal') {
        // Allow narrative under extreme evidence
      } else {
        // Suppress narrative (not extreme enough)
        return null;
      }
    }
    
    // Load gate: minimal load suppresses narrative expansion
    if (interpretiveLoad === 'minimal') {
      return null;
    }
    
    // Load gate: constrained load suppresses narrative expansion
    if (interpretiveLoad === 'constrained' && regimeNarrative) {
      // Suppress narrative if it describes variation or change (suppress expansion)
      if (regimeNarrative.text.includes('varied') || regimeNarrative.text.includes('change') || 
          regimeNarrative.text.includes('shift') || regimeNarrative.text.includes('instability')) {
        return null;
      }
    }
    
    // Load gate: saturated load allows compression only (no new interpretations)
    // If narrative exists, allow it (it's already compressed)
    if (interpretiveLoad === 'saturated') {
      // Allow existing narrative but don't introduce new ones
      return regimeNarrative;
    }
    
    // Collapse rule: suppress narrative when emergence has collapsed
    if (emergencePersistence === 'collapsed') {
      return null;
    }
    
    // Persistence gate: narrative compression suppressed unless persistence is non-none
    if (emergencePersistence === 'none' && regimeNarrative) {
      // Suppress narrative if it describes variation or change without emergence
      if (regimeNarrative.text.includes('varied') || regimeNarrative.text.includes('change') || 
          regimeNarrative.text.includes('shift') || regimeNarrative.text.includes('instability')) {
        return null;
      }
    }
    
    // Transient emergence: allow narrative but compress if it describes change
    if (emergencePersistence === 'transient' && regimeNarrative) {
      // Suppress narrative if it describes variation or change (transient = not sustained)
      if (regimeNarrative.text.includes('varied') || regimeNarrative.text.includes('change') || 
          regimeNarrative.text.includes('shift') || regimeNarrative.text.includes('instability')) {
        return null;
      }
    }
    
    // ENVIRONMENT_DOMINANT: suppress narrative if it's too detailed (compression)
    if (feedbackMode === 'ENVIRONMENT_DOMINANT' && regimeNarrative) {
      // Suppress narrative if it describes variation or change (environment dominant = stability)
      if (regimeNarrative.text.includes('varied') || regimeNarrative.text.includes('change') || 
          regimeNarrative.text.includes('shift') || regimeNarrative.text.includes('instability')) {
        return null;
      }
    }
    
    return regimeNarrative;
  }, [epistemicBoundarySeal, observationClosure, feedbackMode, emergenceSignal, emergencePersistence, interpretiveLoad, interpretiveIrreversibility, structuralDeviationMagnitude, continuityNote, entropicDecayState, saturationState, regimeNarrative]);

  const effectiveContinuations = useMemo(() => {
    // Entropic decay gate: suppress meaning when decay threshold crossed
    if (shouldSuppressMeaning(entropicDecayState)) {
      return [];
    }

    // Saturation gate: filter out continuations displaced by saturation ceiling
    const filteredContinuations = continuations.filter(continuation =>
      !shouldSuppressDueToSaturation(continuation.id, saturationState)
    );

    // Epistemic boundary gate: when closed, multiplicity is capped at 0 or 1
    // Only minimal factual summaries allowed
    if (epistemicBoundarySeal.epistemicallyClosed) {
      return []; // Cap at 0 when epistemically closed
    }
    
    if (observationClosure === 'closed') {
      return [];
    }
    
    // Irreversibility gate: locked suppresses all continuations
    if (interpretiveIrreversibility === 'locked') {
      return [];
    }
    
    // Irreversibility gate: hardened requires extreme evidence
    if (interpretiveIrreversibility === 'hardened') {
      // Hardened allows interpretation only under extreme evidence
      if (emergencePersistence === 'persistent' &&
          structuralDeviationMagnitude > 0.6 &&
          continuityNote !== null &&
          feedbackMode === 'OBSERVER_DOMINANT' &&
          interpretiveLoad !== 'minimal') {
        // Allow limited continuations under extreme evidence (max 1)
        return filteredContinuations.slice(0, 1);
      } else {
        // Suppress continuations (not extreme enough)
        return [];
      }
    }
    
    // Load gate: minimal load allows silence or single weak interpretation
    if (interpretiveLoad === 'minimal') {
      return filteredContinuations.slice(0, 1);
    }
    
    // Load gate: constrained load allows limited multiplicity (max 2)
    if (interpretiveLoad === 'constrained') {
      return filteredContinuations.slice(0, 2);
    }
    
    // Load gate: saturated load allows compression only (no new interpretations)
    // Limit to 1 continuation for saturated
    if (interpretiveLoad === 'saturated') {
      return filteredContinuations.slice(0, 1);
    }
    
    // Collapse rule: suppress all continuations when emergence has collapsed
    if (emergencePersistence === 'collapsed') {
      return [];
    }
    
    // Persistence gate: sustained multiplicity only when persistent
    if (emergencePersistence === 'persistent') {
      // Persistent emergence: allow full multiplicity based on emergence signal strength
      // But respect load limits (max 2 from constrained load)
      if (emergenceSignal === 'strong') {
        return filteredContinuations.slice(0, 2); // Respect load limit
      } else if (emergenceSignal === 'weak') {
        return filteredContinuations.slice(0, 2);
      }
      return filteredContinuations.slice(0, 1);
    }
    
    // Transient emergence: allow brief multiplicity then silence
    if (emergencePersistence === 'transient') {
      return filteredContinuations.slice(0, 1); // Limit to 1 for transient
    }
    
    // No persistence: suppress multiplicity
    if (emergencePersistence === 'none') {
      return filteredContinuations.slice(0, 1); // Suppress multiplicity
    }
    
    // Fallback to emergence signal gating (but respect load limits)
    if (emergenceSignal === 'none') {
      return filteredContinuations.slice(0, 1);
    } else if (emergenceSignal === 'weak') {
      return filteredContinuations.slice(0, 2);
    } else if (emergenceSignal === 'strong') {
      return filteredContinuations.slice(0, 2); // Respect load limit (max 2)
    }
    
    // ENVIRONMENT_DOMINANT: allow fewer continuations (limit to 1)
    if (feedbackMode === 'ENVIRONMENT_DOMINANT') {
      return filteredContinuations.slice(0, 1);
    }
    
    // OBSERVER_DOMINANT: allow more continuations (but respect load limits)
    if (feedbackMode === 'OBSERVER_DOMINANT') {
      return filteredContinuations.slice(0, 2); // Respect load limit (max 2)
    }
    
    // COUPLED: normal behavior (existing limits apply, but respect load)
    return filteredContinuations.slice(0, 2); // Default to max 2
  }, [epistemicBoundarySeal, observationClosure, feedbackMode, emergenceSignal, emergencePersistence, interpretiveLoad, interpretiveIrreversibility, structuralDeviationMagnitude, continuityNote, entropicDecayState, saturationState, continuations]);

  const effectivePositionalDrift = useMemo(() => {
    if (observationClosure === 'closed') {
      return null;
    }
    
    // ENVIRONMENT_DOMINANT: suppress positional drift (environment dominant = stability)
    if (feedbackMode === 'ENVIRONMENT_DOMINANT') {
      return null;
    }
    
    return positionalDrift;
  }, [observationClosure, feedbackMode, positionalDrift]);

  // Observer position: omit for ENVIRONMENT_DOMINANT when narrative is suppressed
  const effectiveObserverPosition = useMemo(() => {
    if (observationClosure === 'closed') {
      return null;
    }
    
    // ENVIRONMENT_DOMINANT: omit position if narrative is suppressed (stability focus)
    if (feedbackMode === 'ENVIRONMENT_DOMINANT' && !effectiveRegimeNarrative) {
      return null;
    }
    
    return observerPosition;
  }, [observationClosure, feedbackMode, effectiveRegimeNarrative, observerPosition]);

  // Map finalized inference outputs to view model (representation layer)
  // This separates inference from presentation - UI only consumes view models
  const viewModel = useMemo(() => {
    if (!yearlyWrap) {
      return null;
    }

    const finalizedOutputs: FinalizedInferenceOutputs = {
      yearlyWrap,
      narrative: effectiveRegimeNarrative,
      continuations: effectiveContinuations,
      observerPosition: effectiveObserverPosition,
      positionalDrift: effectivePositionalDrift,
      conceptualClusters,
      clusterAssociations,
      continuityNote,
      epistemicBoundarySeal,
      observationClosure,
    };

    return mapToViewModel(finalizedOutputs);
  }, [
    yearlyWrap,
    effectiveRegimeNarrative,
    effectiveContinuations,
    effectiveObserverPosition,
    effectivePositionalDrift,
    conceptualClusters,
    clusterAssociations,
    continuityNote,
    epistemicBoundarySeal,
    observationClosure,
  ]);

  // Temporal witness - strictly downstream, consumes reflection entries only
  // No inference logic, no narrative, no causality
  const temporalWitness = useMemo(() => {
    return witnessTemporalPatterns(reflections, 'month');
  }, [reflections]);

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

  // Silence: No empty containers, no placeholder text, no explanatory copy
  // Silence = visual quiet (space, muted tone, nothing rendered)
  if (loading || error || !yearlyWrap || !viewModel) {
    return (
      <YearlyWrapContainer>
        <div />
      </YearlyWrapContainer>
    );
  }

  // UI now consumes only view model (representation layer)
  // All inference logic is upstream and finalized
  const {
    yearlyWrap: vmYearlyWrap,
    narrative: vmNarrative,
    continuations: vmContinuations,
    observerPosition: vmObserverPosition,
    positionalDrift: vmPositionalDrift,
    conceptualClusters: vmClusters,
    clusterAssociations: vmAssociations,
    continuityNote: vmContinuityNote,
    silenceState,
  } = viewModel;

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
          {vmYearlyWrap.headline}
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed max-w-[65ch]">
          {vmYearlyWrap.summary}
        </p>
      </div>

      {/* Density and Cadence Labels - Removed per visual grammar: badges are forbidden visuals */}
      {/* Badges imply achievement and are not part of the visual grammar */}

      {/* Dominant Pattern */}
      {vmYearlyWrap.dominantPattern && (
        <div className="mb-16 pb-12 border-b border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Dominant Pattern</h3>
          <p className="text-base text-gray-800">{vmYearlyWrap.dominantPattern}</p>
        </div>
      )}

      {/* Key Moments */}
      {vmYearlyWrap.keyMoments.length > 0 && (
        <div className="mb-16">
          <h3 className="text-lg font-normal text-gray-900 mb-8">Key Moments</h3>
          <div className="space-y-8">
            {vmYearlyWrap.keyMoments.map((moment) => (
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
      {/* Visual grammar: No arrows or directional symbols (forbidden visuals) */}
      {vmYearlyWrap.shifts.length > 0 && (
        <div className="mb-16 pt-12 border-t border-gray-200">
          <h3 className="text-sm font-normal text-gray-600 mb-6">Shifts</h3>
          <div className="space-y-4">
            {vmYearlyWrap.shifts.map((shift) => (
              <div key={shift.id} className="text-sm">
                <p className="font-normal text-gray-700 mb-1">{shift.headline}</p>
                <p className="text-gray-600 leading-relaxed">{shift.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earlier echoes - Continuity note */}
      {vmContinuityNote && (
        <div className="mb-16 pt-12 border-t border-gray-200">
          <h3 className="text-sm font-normal text-gray-600 mb-4">Earlier echoes</h3>
          <p className="text-base text-gray-700 leading-relaxed">
            {vmContinuityNote.text}
          </p>
        </div>
      )}

      {/* Recurring regions - Conceptual clusters */}
      {vmClusters.length > 0 && (
        <div className="mb-16 pt-12 border-t border-gray-200">
          <h3 className="text-sm font-normal text-gray-600 mb-6">Recurring regions</h3>
          
          {/* Spatial layout - read-only projection */}
          {/* Gated by silence state and entropic decay from representation layer */}
          {vmClusters.length >= 2 && 
           !silenceState.spatialLayoutSuppressed && 
           !shouldSuppressMeaning(entropicDecayState) && (
            <div className="mb-8">
              <SpatialClusterLayout
                clusters={conceptualClusters}
                associations={clusterAssociations}
              />
            </div>
          )}

          {/* Continuations - conditional option space (only transitional/emergent) */}
          {/* Visual grammar: Rare emergence - never emphasized, same typographic weight, appears as continuation not highlight */}
          {!silenceState.continuationsSuppressed && vmContinuations.length > 0 && (
            <div className="mb-8 pt-6 border-t border-gray-200">
              <div className="space-y-3">
                {vmContinuations.map((continuation) => (
                  <p key={continuation.id} className="text-sm text-gray-500 leading-relaxed opacity-75">
                    {continuation.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Regime narrative - observational compression across time */}
          {/* Visual grammar: Minimal meaning - muted color, reduced opacity, smaller font */}
          {!silenceState.narrativeSuppressed && vmNarrative && (
            <div className="mb-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 leading-relaxed opacity-80">
                {vmNarrative.text}
              </p>
              {/* Observer position - field position descriptor */}
              {/* Visual grammar: Minimal meaning - single line, muted color, reduced opacity */}
              {!silenceState.observerPositionSuppressed && vmObserverPosition && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 italic opacity-70">
                    {vmObserverPosition.phrase}
                  </p>
                  {/* Positional drift - difference across periods */}
                  {/* Visual grammar: Minimal meaning - muted color, reduced opacity, smaller font */}
                  {!silenceState.positionalDriftSuppressed && vmPositionalDrift && (
                    <p className="text-xs text-gray-400 mt-1 italic opacity-60">
                      {vmPositionalDrift.phrase}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Observer position standalone (if narrative is null but position exists) */}
          {/* Visual grammar: Minimal meaning - single line, muted color, reduced opacity */}
          {silenceState.narrativeSuppressed && !silenceState.observerPositionSuppressed && vmObserverPosition && (
            <div className="mb-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-400 italic opacity-70">
                {vmObserverPosition.phrase}
              </p>
              {/* Positional drift - difference across periods */}
              {/* Visual grammar: Minimal meaning - muted color, reduced opacity */}
              {!silenceState.positionalDriftSuppressed && vmPositionalDrift && (
                <p className="text-xs text-gray-400 mt-1 italic opacity-60">
                  {vmPositionalDrift.phrase}
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-6">
            {vmClusters.map((vmCluster) => {
              // Find original cluster for utility functions (they need original types)
              const originalCluster = conceptualClusters.find(c => c.id === vmCluster.id);
              if (!originalCluster) return null;
              
              const associations = getAssociationsForCluster(vmCluster.id, clusterAssociations, 2);
              return (
                <div key={vmCluster.id} className="text-base text-gray-700">
                  <p className="font-normal mb-1">{vmCluster.label}</p>
                  {/* Visual grammar: Minimal meaning - muted color, reduced opacity, no bullets (icons forbidden) */}
                  {originalCluster.faded && originalCluster.fadePhrase && (
                    <p className="text-xs text-gray-400 mb-1 opacity-70">{originalCluster.fadePhrase}</p>
                  )}
                  {vmCluster.description && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-2">{vmCluster.description}</p>
                  )}
                  {associations.length > 0 && (
                    <div className="mt-3 ml-4 text-sm text-gray-600">
                      <p className="mb-2">Often appears alongside:</p>
                      <ul className="list-none space-y-1">
                        {associations.map((assoc) => {
                          const associatedClusterId = getAssociatedClusterId(assoc, vmCluster.id);
                          const associatedVmCluster = vmClusters.find(c => c.id === associatedClusterId);
                          const associatedOriginalCluster = conceptualClusters.find(c => c.id === associatedClusterId);
                          if (!associatedVmCluster || !associatedOriginalCluster) return null;
                          
                          // Calculate distance for this association (with silence rules)
                          // Note: This uses utility functions on original clusters, not inference
                          const currentYear = new Date().getFullYear().toString();
                          const distance = calculateClusterDistance(originalCluster, associatedOriginalCluster, {
                            allClusters: conceptualClusters, // Utility functions need original types
                            currentPeriod: currentYear,
                          });
                          
                          // Only show distance if it passes silence rules
                          const distancePhrase = distance !== null ? getDistancePhrase(distance) : null;
                          
                          return (
                            <li key={assoc.fromClusterId + assoc.toClusterId} className="text-gray-600">
                              – {associatedVmCluster.label}
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

      {/* Temporal witness - non-narrative temporal patterns */}
      {/* Strictly downstream - consumes reflection entries, does not influence inference */}
      <TemporalWitnessView witness={temporalWitness} />
    </YearlyWrapContainer>
  );
}

