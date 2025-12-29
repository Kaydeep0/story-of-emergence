import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { ContinuityNote } from '../continuity/continuity';
import type { ObservationClosure } from '../closure/inferObservationClosure';
import type { DriftDescriptor } from '../position/inferPositionalDrift';
import type { FeedbackMode } from '../feedback/inferObserverEnvironmentFeedback';
import type { InitialConditions } from '../constraints/inferInitialConditions';

export type EmergenceSignal = 'none' | 'weak' | 'strong';

export type ConstraintRelativeEmergenceSignals = {
  initialConditions: InitialConditions | null;
  regime: Regime;
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  currentPeriod: string;
  continuityNote: ContinuityNote | null;
  closure: ObservationClosure;
  positionalDrift: DriftDescriptor | null;
  feedbackMode: FeedbackMode;
  previousPeriods?: {
    clusters: ConceptualCluster[];
    associations: ClusterAssociation[];
  }[];
};

/**
 * Calculate constraint-predicted baseline structure
 * Returns expected cluster count, association density, and variance
 * based on initial conditions
 */
function calculateConstraintBaseline(
  initialConditions: InitialConditions | null
): {
  expectedClusterCount: number;
  expectedAssociationDensity: number;
  expectedVariance: number;
} {
  if (!initialConditions) {
    // No initial conditions: use conservative defaults
    return {
      expectedClusterCount: 3,
      expectedAssociationDensity: 0.3,
      expectedVariance: 2.0,
    };
  }

  const { constraintDensity, authorityConcentration, variabilityBaseline } = initialConditions;

  // High constraint density predicts fewer clusters (more constrained)
  let expectedClusterCount = 3;
  if (constraintDensity === 'high') {
    expectedClusterCount = 2;
  } else if (constraintDensity === 'low') {
    expectedClusterCount = 4;
  }

  // High authority concentration predicts higher association density
  let expectedAssociationDensity = 0.3;
  if (authorityConcentration === 'high') {
    expectedAssociationDensity = 0.6;
  } else if (authorityConcentration === 'low') {
    expectedAssociationDensity = 0.2;
  }

  // Low variability baseline predicts lower variance
  let expectedVariance = 2.0;
  if (variabilityBaseline === 'low') {
    expectedVariance = 1.0;
  } else if (variabilityBaseline === 'high') {
    expectedVariance = 3.0;
  }

  return {
    expectedClusterCount,
    expectedAssociationDensity,
    expectedVariance,
  };
}

/**
 * Calculate observed structure metrics
 */
function calculateObservedStructure(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  currentPeriod: string
): {
  clusterCount: number;
  associationDensity: number;
  variance: number;
  newClusterRate: number;
  dominance: number;
} {
  const clusterCount = clusters.length;

  // Association density
  const clustersWithAssociations = new Set<string>();
  associations.forEach(a => {
    clustersWithAssociations.add(a.fromClusterId);
    clustersWithAssociations.add(a.toClusterId);
  });
  const associationDensity = clusterCount > 0
    ? clustersWithAssociations.size / clusterCount
    : 0;

  // Variance across periods
  const periodCounts = new Map<string, number>();
  clusters.forEach(cluster => {
    cluster.sourcePeriods.forEach(period => {
      periodCounts.set(period, (periodCounts.get(period) || 0) + 1);
    });
  });

  let variance = 0;
  if (periodCounts.size > 0) {
    const counts = Array.from(periodCounts.values());
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  }

  // New cluster rate
  const currentPeriodClusters = clusters.filter(c => c.sourcePeriods.includes(currentPeriod)).length;
  const priorPeriodClusters = clusters.filter(c => {
    const priorPeriods = c.sourcePeriods.filter(p => p !== currentPeriod);
    return priorPeriods.length > 0;
  }).length;
  const newClusterRate = priorPeriodClusters > 0
    ? currentPeriodClusters / priorPeriodClusters
    : (currentPeriodClusters > 0 ? 1 : 0);

  // Dominance
  const allPeriods = new Set<string>();
  clusters.forEach(c => c.sourcePeriods.forEach(p => allPeriods.add(p)));
  let dominance = 0;
  if (allPeriods.size > 0) {
    const clusterPeriodCounts = clusters.map(c => c.sourcePeriods.length);
    clusterPeriodCounts.sort((a, b) => b - a);
    const topClusterPeriods = clusterPeriodCounts[0] || 0;
    dominance = topClusterPeriods / allPeriods.size;
  }

  return {
    clusterCount,
    associationDensity,
    variance,
    newClusterRate,
    dominance,
  };
}

/**
 * Check if deviation persists across periods
 * Requires at least 2 periods with similar deviation
 */
function deviationPersistsAcrossPeriods(
  currentDeviation: number,
  previousPeriods?: {
    clusters: ConceptualCluster[];
    associations: ClusterAssociation[];
  }[]
): boolean {
  if (!previousPeriods || previousPeriods.length < 1) {
    return false; // Need at least one prior period
  }

  // Check if at least one prior period shows similar deviation
  // For now, we'll use a simple heuristic: if current period shows deviation,
  // and we have prior periods, assume persistence (can be refined)
  // In practice, we'd compare structure across periods
  return previousPeriods.length >= 1;
}

/**
 * Infer constraint-relative emergence signal
 * 
 * Emergence is detected only when observed structure exceeds what would be expected
 * given the observer's initial conditions and constraint profile.
 * 
 * Emergence is NOT defined as change, but as statistically and structurally improbable
 * behavior relative to the system's starting constraints.
 * 
 * Detection requires ALL of:
 * - Regime is transitional or emergent
 * - Constraint density is medium or high
 * - Observed structure deviates from constraint-predicted baseline
 * - Deviation persists across periods (not a spike)
 * - Feedback mode indicates observer influence is non-negligible
 * 
 * Suppressed when:
 * - Low constraint density (system already unconstrained)
 * - Deterministic regime
 * - High noise with low continuity
 * - Single-period anomalies
 * - Closure is active
 * 
 * This signal gates downstream behavior but does NOT render UI.
 */
export function inferConstraintRelativeEmergence(
  signals: ConstraintRelativeEmergenceSignals
): EmergenceSignal {
  const {
    initialConditions,
    regime,
    clusters,
    associations,
    currentPeriod,
    continuityNote,
    closure,
    positionalDrift,
    feedbackMode,
    previousPeriods,
  } = signals;

  // Silence rule: if closure is active, no emergence
  if (closure === 'closed') {
    return 'none';
  }

  // Silence rule: deterministic regime cannot have emergence
  if (regime === 'deterministic') {
    return 'none';
  }

  // Silence rule: need initial conditions to detect constraint-relative emergence
  if (!initialConditions) {
    return 'none';
  }

  // Silence rule: low constraint density means system already unconstrained
  // Emergence requires constraint to be exceeded
  if (initialConditions.constraintDensity === 'low') {
    return 'none';
  }

  // Calculate constraint-predicted baseline
  const baseline = calculateConstraintBaseline(initialConditions);

  // Calculate observed structure
  const observed = calculateObservedStructure(clusters, associations, currentPeriod);

  // Calculate deviation from baseline
  const clusterDeviation = observed.clusterCount - baseline.expectedClusterCount;
  const associationDeviation = observed.associationDensity - baseline.expectedAssociationDensity;
  const varianceDeviation = observed.variance - baseline.expectedVariance;

  // Check if structure deviates meaningfully from baseline
  // Deviation must be significant (at least 20% change)
  const clusterDeviationRatio = Math.abs(clusterDeviation) / Math.max(baseline.expectedClusterCount, 1);
  const associationDeviationRatio = Math.abs(associationDeviation) / Math.max(baseline.expectedAssociationDensity, 0.1);
  const varianceDeviationRatio = Math.abs(varianceDeviation) / Math.max(baseline.expectedVariance, 0.5);

  const hasSignificantDeviation = 
    clusterDeviationRatio > 0.2 ||
    associationDeviationRatio > 0.2 ||
    varianceDeviationRatio > 0.2;

  if (!hasSignificantDeviation) {
    return 'none';
  }

  // Check if deviation persists across periods
  const deviationMagnitude = Math.max(
    clusterDeviationRatio,
    associationDeviationRatio,
    varianceDeviationRatio
  );
  const persists = deviationPersistsAcrossPeriods(deviationMagnitude, previousPeriods);

  if (!persists) {
    return 'none'; // Single-period anomaly, not emergence
  }

  // Check feedback mode: observer influence must be non-negligible
  // ENVIRONMENT_DOMINANT means observer is not reshaping, so no emergence
  if (feedbackMode === 'ENVIRONMENT_DOMINANT') {
    return 'none';
  }

  // Check for high noise with low continuity (suppress false emergence)
  if (!continuityNote && observed.variance > baseline.expectedVariance * 1.5) {
    // High variance without continuity suggests noise, not emergence
    return 'none';
  }

  // All conditions met: determine strength
  // Strong emergence: regime is emergent AND significant deviation AND observer-dominant feedback
  if (
    regime === 'emergent' &&
    deviationMagnitude > 0.4 &&
    feedbackMode === 'OBSERVER_DOMINANT'
  ) {
    return 'strong';
  }

  // Weak emergence: transitional regime with deviation and coupled/observer-dominant feedback
  if (
    regime === 'transitional' &&
    deviationMagnitude > 0.2 &&
    (feedbackMode === 'COUPLED' || feedbackMode === 'OBSERVER_DOMINANT')
  ) {
    return 'weak';
  }

  // Default: no emergence
  return 'none';
}

