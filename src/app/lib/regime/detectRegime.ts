import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { InitialConditions } from '../constraints/inferInitialConditions';

export type Regime = 'deterministic' | 'transitional' | 'emergent';

export type RegimeSignals = {
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  currentPeriod: string;
  initialConditions?: InitialConditions | null;
};

/**
 * Calculate cluster dominance ratio
 * Returns ratio of top cluster's periods to total unique periods
 */
function calculateClusterDominance(clusters: ConceptualCluster[]): number {
  if (clusters.length === 0) {
    return 0;
  }

  const allPeriods = new Set<string>();
  clusters.forEach(cluster => {
    cluster.sourcePeriods.forEach(period => allPeriods.add(period));
  });

  if (allPeriods.size === 0) {
    return 0;
  }

  // Find cluster with most periods
  const clusterPeriodCounts = clusters.map(cluster => ({
    cluster,
    count: cluster.sourcePeriods.length,
  }));

  clusterPeriodCounts.sort((a, b) => b.count - a.count);
  const topClusterPeriods = clusterPeriodCounts[0]?.count || 0;

  return topClusterPeriods / allPeriods.size;
}

/**
 * Calculate variance across periods
 * Measures how spread out cluster appearances are
 */
function calculatePeriodVariance(clusters: ConceptualCluster[]): number {
  if (clusters.length === 0) {
    return 0;
  }

  const periodCounts = new Map<string, number>();
  clusters.forEach(cluster => {
    cluster.sourcePeriods.forEach(period => {
      periodCounts.set(period, (periodCounts.get(period) || 0) + 1);
    });
  });

  if (periodCounts.size === 0) {
    return 0;
  }

  const counts = Array.from(periodCounts.values());
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;

  return variance;
}

/**
 * Calculate rate of new cluster formation
 * Returns ratio of clusters appearing in current period vs prior periods
 */
function calculateNewClusterRate(
  clusters: ConceptualCluster[],
  currentPeriod: string
): number {
  if (clusters.length === 0) {
    return 0;
  }

  const currentPeriodClusters = clusters.filter(cluster =>
    cluster.sourcePeriods.includes(currentPeriod)
  ).length;

  const priorPeriodClusters = clusters.filter(cluster => {
    const priorPeriods = cluster.sourcePeriods.filter(p => p !== currentPeriod);
    return priorPeriods.length > 0;
  }).length;

  if (priorPeriodClusters === 0) {
    return currentPeriodClusters > 0 ? 1 : 0;
  }

  return currentPeriodClusters / priorPeriodClusters;
}

/**
 * Calculate concentration of associations
 * Returns ratio of clusters with associations to total clusters
 */
function calculateAssociationConcentration(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): number {
  if (clusters.length === 0) {
    return 0;
  }

  const clustersWithAssociations = new Set<string>();
  associations.forEach(assoc => {
    clustersWithAssociations.add(assoc.fromClusterId);
    clustersWithAssociations.add(assoc.toClusterId);
  });

  return clustersWithAssociations.size / clusters.length;
}

/**
 * Calculate cross-period structural reuse
 * Measures how many clusters appear across multiple periods
 */
function calculateStructuralReuse(clusters: ConceptualCluster[]): number {
  if (clusters.length === 0) {
    return 0;
  }

  const multiPeriodClusters = clusters.filter(
    cluster => cluster.sourcePeriods.length >= 2
  ).length;

  return multiPeriodClusters / clusters.length;
}

/**
 * Detect observer-environment regime
 * Pure deterministic function - same inputs always return same regime
 * Regime may only change between periods, never within a period
 * 
 * Regime is read-only, never rendered, produces no text/labels/UI
 * Regime only gates observation visibility
 */
export function detectRegime(signals: RegimeSignals): Regime {
  const { clusters, associations, currentPeriod } = signals;

  if (clusters.length === 0) {
    return 'deterministic'; // Default to deterministic when no data
  }

  // Calculate signals
  const dominance = calculateClusterDominance(clusters);
  const variance = calculatePeriodVariance(clusters);
  const newClusterRate = calculateNewClusterRate(clusters, currentPeriod);
  const associationConcentration = calculateAssociationConcentration(clusters, associations);
  const structuralReuse = calculateStructuralReuse(clusters);

  // Modulate thresholds based on initial conditions
  // High constraint density requires stronger evidence for emergence
  // Low variability baseline means variance thresholds should be higher
  const { initialConditions } = signals;
  
  let dominanceThreshold = 0.6;
  let varianceThreshold = 2.0;
  let newClusterRateThreshold = 0.3;
  
  if (initialConditions) {
    // High constraint density: require stronger evidence for emergence
    if (initialConditions.constraintDensity === 'high') {
      dominanceThreshold = 0.7; // Higher threshold
    } else if (initialConditions.constraintDensity === 'low') {
      dominanceThreshold = 0.5; // Lower threshold
    }
    
    // Low variability baseline: variance must be higher to count as transitional
    if (initialConditions.variabilityBaseline === 'low') {
      varianceThreshold = 2.5; // Higher threshold
    } else if (initialConditions.variabilityBaseline === 'high') {
      varianceThreshold = 1.5; // Lower threshold
    }
    
    // High authority concentration: new clusters need stronger signal
    if (initialConditions.authorityConcentration === 'high') {
      newClusterRateThreshold = 0.4; // Higher threshold
    } else if (initialConditions.authorityConcentration === 'low') {
      newClusterRateThreshold = 0.2; // Lower threshold
    }
  }

  // Emergent Regime:
  // - Observer meaningfully reshapes environment
  // - Strong asymmetry (high dominance)
  // - One or two dominant conceptual clusters
  // - Silence elsewhere
  // - Averages collapse (low structural reuse)
  // Thresholds modulated by initial conditions
  if (
    dominance > dominanceThreshold && // Strong dominance (adjusted)
    clusters.length <= 3 && // One or two dominant clusters (with some noise)
    structuralReuse < 0.4 && // Low cross-period reuse
    associationConcentration < 0.5 // Low association concentration
  ) {
    return 'emergent';
  }

  // Transitional Regime:
  // - Mutual coupling between observer and environment
  // - Increasing variance
  // - Accelerating themes (new cluster formation)
  // - Partial pattern breakage and recomposition
  // Thresholds modulated by initial conditions
  if (
    variance > varianceThreshold && // High variance (adjusted)
    newClusterRate > newClusterRateThreshold && // Accelerating themes (adjusted)
    structuralReuse > 0.3 && structuralReuse < 0.7 && // Partial reuse
    associationConcentration > 0.4 // Moderate association concentration
  ) {
    return 'transitional';
  }

  // Deterministic Regime (default):
  // - Environment dominates observer
  // - High repetition
  // - Low variance
  // - Weak cross-period transformation
  // - Stable pattern persistence
  return 'deterministic';
}

