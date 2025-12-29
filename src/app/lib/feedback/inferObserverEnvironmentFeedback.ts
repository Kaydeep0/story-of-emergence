import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { ContinuityNote } from '../continuity/continuity';
import type { ObservationClosure } from '../closure/inferObservationClosure';
import type { DriftDescriptor } from '../position/inferPositionalDrift';
import type { InitialConditions } from '../constraints/inferInitialConditions';

export type FeedbackMode = 'ENVIRONMENT_DOMINANT' | 'COUPLED' | 'OBSERVER_DOMINANT';

export type FeedbackSignals = {
  regime: Regime;
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  currentPeriod: string;
  continuityNote: ContinuityNote | null;
  closure: ObservationClosure;
  positionalDrift: DriftDescriptor | null;
  initialConditions?: InitialConditions | null;
};

/**
 * Calculate environment influence score (0..1)
 * Higher values indicate environment shapes observer more than observer shapes environment
 */
function calculateEnvironmentInfluence(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  currentPeriod: string,
  continuityNote: ContinuityNote | null
): number {
  if (clusters.length === 0) {
    return 1; // No clusters = default to environment dominant
  }

  // Signal 1: High recurrence of same clusters across periods
  const multiPeriodClusters = clusters.filter(c => c.sourcePeriods.length >= 2).length;
  const recurrenceRatio = clusters.length > 0 ? multiPeriodClusters / clusters.length : 0;

  // Signal 2: Low variance in cluster composition
  const clusterSizes = clusters.map(c => c.sourcePeriods.length);
  const meanSize = clusterSizes.reduce((sum, size) => sum + size, 0) / clusterSizes.length;
  const variance = clusterSizes.reduce((sum, size) => {
    const diff = size - meanSize;
    return sum + (diff * diff);
  }, 0) / clusterSizes.length;
  const normalizedVariance = Math.max(0, 1 - Math.min(variance / 10, 1)); // Inverse: lower variance = higher env influence

  // Signal 3: Strong continuity signals
  const continuitySignal = continuityNote !== null ? 1 : 0;

  // Signal 4: Low introduction rate of new clusters
  const currentPeriodClusters = clusters.filter(c => c.sourcePeriods.includes(currentPeriod)).length;
  const priorPeriodClusters = clusters.filter(c => {
    const priorPeriods = c.sourcePeriods.filter(p => p !== currentPeriod);
    return priorPeriods.length > 0;
  }).length;
  const newClusterRate = priorPeriodClusters > 0
    ? currentPeriodClusters / priorPeriodClusters
    : (currentPeriodClusters > 0 ? 0 : 1); // Lower rate = higher env influence
  const inverseNewClusterRate = 1 - Math.min(newClusterRate, 1);

  // Combine signals (weighted)
  const environmentScore = (
    recurrenceRatio * 0.35 +
    normalizedVariance * 0.25 +
    continuitySignal * 0.25 +
    inverseNewClusterRate * 0.15
  );

  return Math.max(0, Math.min(1, environmentScore));
}

/**
 * Calculate observer influence score (0..1)
 * Higher values indicate observer reshapes environment more than environment shapes observer
 */
function calculateObserverInfluence(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  currentPeriod: string,
  continuityNote: ContinuityNote | null,
  positionalDrift: DriftDescriptor | null
): number {
  if (clusters.length === 0) {
    return 0; // No clusters = no observer influence
  }

  // Signal 1: Rapid introduction of new clusters
  const currentPeriodClusters = clusters.filter(c => c.sourcePeriods.includes(currentPeriod)).length;
  const priorPeriodClusters = clusters.filter(c => {
    const priorPeriods = c.sourcePeriods.filter(p => p !== currentPeriod);
    return priorPeriods.length > 0;
  }).length;
  const newClusterRate = priorPeriodClusters > 0
    ? currentPeriodClusters / priorPeriodClusters
    : (currentPeriodClusters > 0 ? 1 : 0);
  const normalizedNewClusterRate = Math.min(newClusterRate, 1);

  // Signal 2: High divergence from prior dominant clusters
  // Check if current period clusters differ significantly from prior periods
  const allPeriods = new Set<string>();
  clusters.forEach(c => c.sourcePeriods.forEach(p => allPeriods.add(p)));
  
  let divergenceScore = 0;
  if (allPeriods.size > 1) {
    // Calculate how many clusters appear ONLY in current period (relative to their first appearance)
    const newFormations = clusters.filter(c => {
      const sortedPeriods = [...c.sourcePeriods].sort();
      const currentIndex = sortedPeriods.indexOf(currentPeriod);
      return currentIndex < 2 && c.sourcePeriods.length <= 3; // Recently formed
    }).length;
    divergenceScore = clusters.length > 0 ? newFormations / clusters.length : 0;
  }

  // Signal 3: Increasing asymmetry (one cluster overtaking others)
  const clusterSizes = clusters.map(c => c.sourcePeriods.length);
  clusterSizes.sort((a, b) => b - a);
  const topClusterSize = clusterSizes[0] || 0;
  const secondClusterSize = clusterSizes[1] || 0;
  const asymmetryRatio = topClusterSize > 0 && secondClusterSize > 0
    ? topClusterSize / (topClusterSize + secondClusterSize)
    : 0;
  // Higher asymmetry = more observer influence (reshaping toward dominance)

  // Signal 4: Structural breaks in continuity without closure
  // Positional drift without closure indicates active reshaping
  const structuralBreakSignal = positionalDrift !== null ? 1 : 0;

  // Combine signals (weighted)
  const observerScore = (
    normalizedNewClusterRate * 0.3 +
    divergenceScore * 0.25 +
    asymmetryRatio * 0.25 +
    structuralBreakSignal * 0.2
  );

  return Math.max(0, Math.min(1, observerScore));
}

/**
 * Infer observer-environment feedback mode
 * 
 * This encodes the bidirectional feedback loop between observer and environment.
 * It describes whether structure is:
 * - environment-dominant (environment shapes observer more)
 * - observer-dominant (observer reshapes environment)
 * - coupled (mutual shaping)
 * 
 * This is internal only. Never rendered. Only gates downstream interpretation density.
 * 
 * Decision logic:
 * - If environment indicators dominate → ENVIRONMENT_DOMINANT
 * - If observer indicators dominate → OBSERVER_DOMINANT
 * - Otherwise → COUPLED
 * 
 * Closure overrides: if period is closed, default to ENVIRONMENT_DOMINANT (stability)
 */
export function inferObserverEnvironmentFeedback(signals: FeedbackSignals): FeedbackMode {
  const { clusters, associations, currentPeriod, continuityNote, closure, positionalDrift } = signals;

  // Closure rule: if period is closed, default to environment dominant (stability)
  if (closure === 'closed') {
    return 'ENVIRONMENT_DOMINANT';
  }

  // Calculate influence scores
  const environmentInfluence = calculateEnvironmentInfluence(
    clusters,
    associations,
    currentPeriod,
    continuityNote
  );

  const observerInfluence = calculateObserverInfluence(
    clusters,
    associations,
    currentPeriod,
    continuityNote,
    positionalDrift
  );

  // Decision logic: compare influence scores
  // Stabilize against initial conditions
  let influenceDifference = environmentInfluence - observerInfluence;
  let threshold = 0.15; // Default threshold for dominance

  // Adjust threshold based on initial conditions
  if (signals.initialConditions) {
    const { constraintDensity, authorityConcentration } = signals.initialConditions;
    
    // High constraint density: require stronger evidence for observer dominance
    if (constraintDensity === 'high') {
      threshold = 0.2; // Higher threshold (harder to be observer-dominant)
      // Bias toward environment dominant if close to threshold
      if (influenceDifference > -0.1 && influenceDifference < threshold) {
        influenceDifference += 0.05; // Slight bias toward environment
      }
    } else if (constraintDensity === 'low') {
      threshold = 0.1; // Lower threshold (easier to be observer-dominant)
    }
    
    // High authority concentration: stabilize toward environment dominant
    if (authorityConcentration === 'high' && influenceDifference > -0.1) {
      influenceDifference += 0.05; // Bias toward environment
    }
  }

  if (influenceDifference > threshold) {
    return 'ENVIRONMENT_DOMINANT';
  } else if (influenceDifference < -threshold) {
    return 'OBSERVER_DOMINANT';
  } else {
    return 'COUPLED';
  }
}

