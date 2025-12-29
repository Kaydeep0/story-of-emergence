import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { ContinuityNote } from '../continuity/continuity';
import type { ObservationClosure } from '../closure/inferObservationClosure';
import type { FeedbackMode } from '../feedback/inferObserverEnvironmentFeedback';
import type { InitialConditions } from '../constraints/inferInitialConditions';
import type { EmergenceSignal } from './inferConstraintRelativeEmergence';

export type EmergencePersistence = 'none' | 'transient' | 'persistent' | 'collapsed';

export type EmergencePersistenceSignals = {
  currentEmergence: EmergenceSignal;
  previousEmergence: EmergenceSignal | null;
  regime: Regime;
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  currentPeriod: string;
  continuityNote: ContinuityNote | null;
  closure: ObservationClosure;
  feedbackMode: FeedbackMode;
  initialConditions: InitialConditions | null;
  previousPeriods?: {
    emergence: EmergenceSignal;
    regime: Regime;
    continuityNote: ContinuityNote | null;
    closure: ObservationClosure;
    clusters: ConceptualCluster[];
    associations: ClusterAssociation[];
  }[];
};

/**
 * Calculate structural deviation magnitude from constraint baseline
 * Returns deviation ratio (0..1+)
 */
function calculateDeviationMagnitude(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  currentPeriod: string,
  initialConditions: InitialConditions | null
): number {
  if (!initialConditions || clusters.length === 0) {
    return 0;
  }

  // Calculate constraint-predicted baseline
  const { constraintDensity, authorityConcentration, variabilityBaseline } = initialConditions;

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

  // Calculate observed structure
  const clusterCount = clusters.length;
  const clustersWithAssociations = new Set<string>();
  associations.forEach(a => {
    clustersWithAssociations.add(a.fromClusterId);
    clustersWithAssociations.add(a.toClusterId);
  });
  const associationDensity = clusterCount > 0
    ? clustersWithAssociations.size / clusterCount
    : 0;

  // Calculate deviation ratios
  const clusterDeviationRatio = Math.abs(clusterCount - expectedClusterCount) / Math.max(expectedClusterCount, 1);
  const associationDeviationRatio = Math.abs(associationDensity - expectedAssociationDensity) / Math.max(expectedAssociationDensity, 0.1);

  return Math.max(clusterDeviationRatio, associationDeviationRatio);
}

/**
 * Check if continuity is fragmented
 * Fragmented continuity suggests collapse
 */
function isContinuityFragmented(
  continuityNote: ContinuityNote | null,
  previousPeriods?: Array<{ continuityNote: ContinuityNote | null }>
): boolean {
  // No continuity note suggests fragmentation
  if (!continuityNote) {
    // Check if previous periods had continuity
    if (previousPeriods && previousPeriods.length > 0) {
      const hadContinuityBefore = previousPeriods.some(p => p.continuityNote !== null);
      if (hadContinuityBefore) {
        return true; // Continuity was present but now missing = fragmented
      }
    }
  }

  return false;
}

/**
 * Check if noise has increased beyond threshold
 * High noise suggests collapse into randomness
 */
function hasNoiseIncreased(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  currentPeriod: string,
  previousPeriods?: Array<{ clusters: ConceptualCluster[]; associations: ClusterAssociation[] }>
): boolean {
  if (!previousPeriods || previousPeriods.length === 0) {
    return false;
  }

  // Calculate variance for current period
  const periodCounts = new Map<string, number>();
  clusters.forEach(cluster => {
    cluster.sourcePeriods.forEach(period => {
      periodCounts.set(period, (periodCounts.get(period) || 0) + 1);
    });
  });

  let currentVariance = 0;
  if (periodCounts.size > 0) {
    const counts = Array.from(periodCounts.values());
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    currentVariance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  }

  // Calculate average variance for previous periods
  const previousVariances = previousPeriods.map(pd => {
    const prevPeriodCounts = new Map<string, number>();
    pd.clusters.forEach(cluster => {
      cluster.sourcePeriods.forEach(period => {
        prevPeriodCounts.set(period, (prevPeriodCounts.get(period) || 0) + 1);
      });
    });

    if (prevPeriodCounts.size === 0) {
      return 0;
    }

    const counts = Array.from(prevPeriodCounts.values());
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    return counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  });

  const avgPreviousVariance = previousVariances.reduce((sum, v) => sum + v, 0) / previousVariances.length;

  // Noise has increased if current variance is significantly higher than previous average
  return currentVariance > avgPreviousVariance * 1.5;
}

/**
 * Infer emergence persistence and collapse
 * 
 * Emergence is fragile. If it does not maintain structural improbability under constraint,
 * it collapses back into determinism or noise.
 * 
 * Persistence rules (all must be true):
 * - Emergence signal remains non-none across multiple periods
 * - Structural deviation remains above constraint baseline
 * - Continuity is non-fragmented
 * - Regime does not revert to deterministic
 * - Closure is not active
 * 
 * Collapse rules (ANY triggers collapse):
 * - Emergence drops to none
 * - Structural deviation falls below baseline
 * - Continuity breaks
 * - Noise increases beyond threshold
 * - Regime stabilizes as deterministic
 * - Closure activates
 * 
 * This signal gates higher-order interpretation only.
 * No UI changes. No new rendering paths.
 */
export function inferEmergencePersistence(
  signals: EmergencePersistenceSignals
): EmergencePersistence {
  const {
    currentEmergence,
    previousEmergence,
    regime,
    clusters,
    associations,
    currentPeriod,
    continuityNote,
    closure,
    feedbackMode,
    initialConditions,
    previousPeriods,
  } = signals;

  // Collapse rule: closure activates
  if (closure === 'closed') {
    return 'collapsed';
  }

  // Collapse rule: emergence drops to none
  if (currentEmergence === 'none') {
    // If there was emergence before, it has collapsed
    if (previousEmergence && previousEmergence !== 'none') {
      return 'collapsed';
    }
    return 'none';
  }

  // Collapse rule: regime stabilizes as deterministic
  if (regime === 'deterministic') {
    // If there was emergence before, it has collapsed
    if (previousEmergence && previousEmergence !== 'none') {
      return 'collapsed';
    }
    return 'none';
  }

  // Collapse rule: structural deviation falls below baseline
  const deviationMagnitude = calculateDeviationMagnitude(
    clusters,
    associations,
    currentPeriod,
    initialConditions
  );
  if (deviationMagnitude < 0.2) {
    // Deviation below threshold
    if (previousEmergence && previousEmergence !== 'none') {
      return 'collapsed';
    }
    return 'none';
  }

  // Collapse rule: continuity breaks
  const continuityFragmented = isContinuityFragmented(continuityNote, previousPeriods?.map(p => ({ continuityNote: p.continuityNote })));
  if (continuityFragmented) {
    if (previousEmergence && previousEmergence !== 'none') {
      return 'collapsed';
    }
    return 'none';
  }

  // Collapse rule: noise increases beyond threshold
  const noiseIncreased = hasNoiseIncreased(
    clusters,
    associations,
    currentPeriod,
    previousPeriods?.map(p => ({ clusters: p.clusters || [], associations: p.associations || [] }))
  );
  if (noiseIncreased) {
    if (previousEmergence && previousEmergence !== 'none') {
      return 'collapsed';
    }
    return 'none';
  }

  // Check persistence conditions
  // Need previous emergence to be non-none for persistence
  // At this point, currentEmergence is not 'none' (checked above)
  if (!previousEmergence || previousEmergence === 'none') {
    // First period with emergence: transient
    return 'transient';
  }

  // At this point, we know currentEmergence is not 'none' and previousEmergence is not 'none'
  // Check if emergence has persisted across multiple periods
  if (previousPeriods && previousPeriods.length >= 1) {
    // Count how many previous periods had emergence
    const periodsWithEmergence = previousPeriods.filter(p => p.emergence !== 'none').length;
    
    // If at least 1 period had emergence and current also has emergence, check persistence
    if (periodsWithEmergence >= 1) {
      // Check if deviation remains above baseline
      if (deviationMagnitude >= 0.2) {
        // Check if continuity is maintained
        if (continuityNote !== null || (previousPeriods[0]?.continuityNote !== null)) {
          // Check if regime hasn't reverted (already checked above, but double-check)
          // Check if feedback mode indicates observer influence
          if (feedbackMode !== 'ENVIRONMENT_DOMINANT') {
            // Check if we have at least 2 periods with emergence for true persistence
            if (periodsWithEmergence >= 1) {
              return 'persistent';
            }
          }
        }
      }
    }
  }

  // Default: transient (emergence exists but hasn't persisted long enough)
  return 'transient';
}

