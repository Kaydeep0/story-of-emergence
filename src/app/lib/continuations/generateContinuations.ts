import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';

export type Continuation = {
  id: string;
  text: string; // Short neutral phrase, conditional in tone
};

export type ContinuationSignals = {
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  regime: Regime;
  currentPeriod: string;
};

/**
 * Generate continuations for transitional regime
 * Describes option space, not future truth
 * Conditional phrasing only
 */
function generateTransitionalContinuations(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): Continuation[] {
  const continuations: Continuation[] = [];

  if (clusters.length === 0) {
    return [];
  }

  // If multiple clusters exist, describe potential lattice structure
  if (clusters.length >= 3) {
    continuations.push({
      id: 'transitional-multiplicity',
      text: 'If this pattern continues, these themes may remain loosely connected.',
    });
  }

  // If associations exist, describe potential consolidation
  if (associations.length > 0) {
    const clustersWithAssociations = new Set<string>();
    associations.forEach(assoc => {
      clustersWithAssociations.add(assoc.fromClusterId);
      clustersWithAssociations.add(assoc.toClusterId);
    });

    if (clustersWithAssociations.size >= 2) {
      continuations.push({
        id: 'transitional-associations',
        text: 'These clusters could further consolidate if associations persist.',
      });
    }
  }

  // If variance is high (many clusters), describe potential divergence
  if (clusters.length >= 4) {
    continuations.push({
      id: 'transitional-divergence',
      text: 'This cluster structure may extend across additional periods.',
    });
  }

  return continuations;
}

/**
 * Generate continuations for emergent regime
 * Describes asymmetry and dominance, not outcomes
 * Conditional phrasing only
 */
function generateEmergentContinuations(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): Continuation[] {
  const continuations: Continuation[] = [];

  if (clusters.length === 0) {
    return [];
  }

  // Sort by dominance (period count)
  const sortedClusters = [...clusters].sort(
    (a, b) => b.sourcePeriods.length - a.sourcePeriods.length
  );

  // If strong dominance exists, describe potential consolidation
  if (sortedClusters.length >= 1 && sortedClusters[0].sourcePeriods.length > 2) {
    continuations.push({
      id: 'emergent-dominance',
      text: 'If this pattern continues, this cluster could further consolidate.',
    });
  }

  // If few associations, describe potential silence
  if (associations.length === 0 && sortedClusters.length <= 2) {
    continuations.push({
      id: 'emergent-silence',
      text: 'These themes may remain distinct without further connection.',
    });
  }

  // If asymmetry is strong, describe potential extension
  if (sortedClusters.length === 2) {
    const topCluster = sortedClusters[0];
    const secondCluster = sortedClusters[1];
    
    if (topCluster.sourcePeriods.length > secondCluster.sourcePeriods.length * 1.5) {
      continuations.push({
        id: 'emergent-asymmetry',
        text: 'This dominant pattern may extend if current structure persists.',
      });
    }
  }

  return continuations;
}

/**
 * Generate continuations based on regime
 * Continuations describe option space, not future truth
 * No forecasts, goals, recommendations, or optimization
 * Only conditional continuation
 * 
 * Continuations may only be generated when:
 * - Regime === Transitional OR Emergent
 * - Silence rules from Phase 7.9 allow output
 * - Deterministic regime must return zero continuations
 */
export function generateContinuations(signals: ContinuationSignals): Continuation[] {
  const { clusters, associations, regime, currentPeriod } = signals;

  // Deterministic regime must return zero continuations
  if (regime === 'deterministic') {
    return [];
  }

  // Apply silence rules - need at least 2 clusters for meaningful continuations
  if (clusters.length < 2) {
    return [];
  }

  // Generate continuations based on regime
  switch (regime) {
    case 'transitional':
      return generateTransitionalContinuations(clusters, associations);

    case 'emergent':
      return generateEmergentContinuations(clusters, associations);

    default:
      return [];
  }
}

