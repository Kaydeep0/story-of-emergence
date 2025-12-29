import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { PositionDescriptor } from '../position/inferObserverPosition';
import type { DriftDescriptor } from '../position/inferPositionalDrift';
import type { Continuation } from '../continuations/generateContinuations';

export type ObservationClosure = 'open' | 'closed';

export type PeriodData = {
  regime: Regime;
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  currentPeriod: string;
  positionalDrift: DriftDescriptor | null;
  continuations: Continuation[];
  observerPosition: PositionDescriptor | null;
};

/**
 * Check if transitional regime is "stable"
 * Stable transitional means low variance, high structural reuse
 * This indicates the transitional state has settled
 */
function isStableTransitional(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): boolean {
  if (clusters.length === 0) {
    return false;
  }

  // Calculate structural reuse (clusters appearing across multiple periods)
  const multiPeriodClusters = clusters.filter(
    cluster => cluster.sourcePeriods.length >= 2
  ).length;
  const structuralReuse = multiPeriodClusters / clusters.length;

  // Calculate association concentration
  const clustersWithAssociations = new Set<string>();
  associations.forEach(assoc => {
    clustersWithAssociations.add(assoc.fromClusterId);
    clustersWithAssociations.add(assoc.toClusterId);
  });
  const associationConcentration = clustersWithAssociations.size / clusters.length;

  // Stable transitional: high structural reuse AND moderate association concentration
  // This indicates patterns have stabilized even if regime is transitional
  return structuralReuse >= 0.6 && associationConcentration >= 0.5;
}

/**
 * Check if new clusters were formed in current period
 * A new cluster is one that appears in current period but not in prior periods
 */
function hasNewClusters(
  clusters: ConceptualCluster[],
  currentPeriod: string
): boolean {
  if (clusters.length === 0) {
    return false;
  }

  // Check if any cluster appears ONLY in current period
  // (This would indicate a new cluster, but clusters require 2+ periods)
  // So we check if any cluster appears in current period AND has minimal prior presence
  for (const cluster of clusters) {
    const appearsInCurrent = cluster.sourcePeriods.includes(currentPeriod);
    const priorPeriods = cluster.sourcePeriods.filter(p => p !== currentPeriod);
    
    // If cluster appears in current period but has very few prior periods,
    // it's likely a new formation
    if (appearsInCurrent && priorPeriods.length < 2) {
      // Actually, clusters require 2+ periods, so this shouldn't happen
      // But we check if the cluster is "new" relative to its formation
      // A truly new cluster would have currentPeriod as one of its first appearances
      const sortedPeriods = [...cluster.sourcePeriods].sort();
      const currentPeriodIndex = sortedPeriods.indexOf(currentPeriod);
      
      // If current period is among the first 2 periods for this cluster,
      // it's relatively new
      if (currentPeriodIndex < 2 && cluster.sourcePeriods.length <= 3) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if multiplicity is surfaced
 * Multiplicity is indicated by continuations with id 'transitional-multiplicity'
 */
function hasMultiplicitySurfaced(continuations: Continuation[]): boolean {
  return continuations.some(cont => cont.id === 'transitional-multiplicity');
}

/**
 * Infer observation closure for a given period
 * 
 * Closure is inferred from structure, not time or user action.
 * A period is closed when all signals indicate stability:
 * - Regime is deterministic OR stable transitional
 * - No positional drift detected
 * - No multiplicity surfaced
 * - No new clusters formed
 * 
 * When closed:
 * - Regime is frozen
 * - Position is frozen
 * - Drift inference is disabled
 * - Continuations are suppressed
 * - Narrative projection returns null
 * 
 * Closure produces silence, not messaging.
 * Closed periods render identically to deterministic silence or insufficient data silence.
 * 
 * @param periodData - Complete period data including regime, clusters, drift, etc.
 * @returns 'open' if observation continues, 'closed' if period is frozen
 */
export function inferObservationClosure(periodData: PeriodData): ObservationClosure {
  const {
    regime,
    clusters,
    associations,
    currentPeriod,
    positionalDrift,
    continuations,
  } = periodData;

  // Closure requires ALL conditions to be true:
  
  // Condition 1: Regime is deterministic OR stable transitional
  const isDeterministicOrStableTransitional =
    regime === 'deterministic' ||
    (regime === 'transitional' && isStableTransitional(clusters, associations));

  if (!isDeterministicOrStableTransitional) {
    return 'open';
  }

  // Condition 2: No positional drift detected
  if (positionalDrift !== null) {
    return 'open';
  }

  // Condition 3: No multiplicity surfaced
  if (hasMultiplicitySurfaced(continuations)) {
    return 'open';
  }

  // Condition 4: No new clusters formed
  if (hasNewClusters(clusters, currentPeriod)) {
    return 'open';
  }

  // All conditions met: period is closed
  return 'closed';
}

