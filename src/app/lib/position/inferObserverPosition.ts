import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';

export type PositionDescriptor = {
  id: string;
  phrase: string; // One short phrase, max 6 words, neutral spatial language
};

export type ObserverPositionSignals = {
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  regime: Regime;
  currentPeriod: string;
};

/**
 * Calculate confidence threshold for position inference
 * Returns true if position can be inferred with sufficient confidence
 */
function hasSufficientConfidence(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  regime: Regime
): boolean {
  // Need at least 2 clusters for meaningful position inference
  if (clusters.length < 2 && regime !== 'emergent') {
    return false;
  }

  // For emergent regime, can infer position with single cluster if it's dominant
  if (regime === 'emergent' && clusters.length >= 1) {
    const sortedClusters = [...clusters].sort(
      (a, b) => b.sourcePeriods.length - a.sourcePeriods.length
    );
    if (sortedClusters[0].sourcePeriods.length >= 2) {
      return true;
    }
  }

  // For deterministic and transitional, need multiple clusters
  if (clusters.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Infer position for deterministic regime
 * Position reflects proximity to constraint
 * No motion language
 */
function inferDeterministicPosition(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): PositionDescriptor | null {
  if (clusters.length === 0) {
    return null;
  }

  // If many stable clusters, position is near constraints
  const stableClusters = clusters.filter(c => c.sourcePeriods.length >= 2);
  if (stableClusters.length >= 3) {
    return {
      id: 'deterministic-constraints',
      phrase: 'Near inherited constraints',
    };
  }

  // If stable associations, position is within constraint structure
  if (associations.length >= 2) {
    return {
      id: 'deterministic-structure',
      phrase: 'Within a stable structure',
    };
  }

  // If single stable cluster, position is at constraint
  if (clusters.length === 1 && clusters[0].sourcePeriods.length >= 2) {
    return {
      id: 'deterministic-single',
      phrase: 'At a persistent constraint',
    };
  }

  // Default deterministic position
  return {
    id: 'deterministic-default',
    phrase: 'Within established patterns',
  };
}

/**
 * Infer position for transitional regime
 * Position reflects boundary, edge, overlap
 * No direction language
 */
function inferTransitionalPosition(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): PositionDescriptor | null {
  if (clusters.length < 2) {
    return null;
  }

  // If associations exist, position is at boundary between clusters
  if (associations.length > 0) {
    return {
      id: 'transitional-boundary',
      phrase: 'At a transitional boundary',
    };
  }

  // If many clusters, position is between multiple regions
  if (clusters.length >= 3) {
    return {
      id: 'transitional-between',
      phrase: 'Between multiple regions',
    };
  }

  // If clusters are appearing/disappearing, position is at edge
  const fadedClusters = clusters.filter(c => c.faded);
  if (fadedClusters.length > 0) {
    return {
      id: 'transitional-edge',
      phrase: 'Along a shifting edge',
    };
  }

  // Default transitional position
  return {
    id: 'transitional-default',
    phrase: 'Within a transitional boundary',
  };
}

/**
 * Infer position for emergent regime
 * Position reflects openness or shaping
 * No achievement language
 */
function inferEmergentPosition(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): PositionDescriptor | null {
  if (clusters.length === 0) {
    return null;
  }

  // Sort by dominance
  const sortedClusters = [...clusters].sort(
    (a, b) => b.sourcePeriods.length - a.sourcePeriods.length
  );

  // If strong dominance, position is at shaping point
  if (sortedClusters.length >= 1 && sortedClusters[0].sourcePeriods.length > 2) {
    if (sortedClusters.length === 1) {
      return {
        id: 'emergent-shaping',
        phrase: 'At a shaping point',
      };
    }

    if (sortedClusters.length === 2) {
      const topCluster = sortedClusters[0];
      const secondCluster = sortedClusters[1];
      
      if (topCluster.sourcePeriods.length > secondCluster.sourcePeriods.length * 1.5) {
        return {
          id: 'emergent-asymmetry',
          phrase: 'At a constraint–emergence edge',
        };
      }
    }
  }

  // If few associations, position is in open structure
  if (associations.length === 0 && sortedClusters.length <= 2) {
    return {
      id: 'emergent-open',
      phrase: 'Operating in open structure',
    };
  }

  // Default emergent position
  return {
    id: 'emergent-default',
    phrase: 'Within an emergent region',
  };
}

/**
 * Infer observer position within the field
 * Position is inferred from feedback structure, not intent
 * 
 * PositionDescriptor:
 * - One short phrase
 * - Max 6 words
 * - Neutral, spatial language
 * - No value judgments
 * 
 * This is not a score, label, or identity.
 * It is a field position descriptor.
 */
export function inferObserverPosition(signals: ObserverPositionSignals): PositionDescriptor | null {
  const { clusters, associations, regime, currentPeriod } = signals;

  // Apply silence rules - check confidence threshold
  if (!hasSufficientConfidence(clusters, associations, regime)) {
    return null;
  }

  // Infer position based on regime
  switch (regime) {
    case 'deterministic':
      return inferDeterministicPosition(clusters, associations);

    case 'transitional':
      return inferTransitionalPosition(clusters, associations);

    case 'emergent':
      return inferEmergentPosition(clusters, associations);

    default:
      return null;
  }
}

