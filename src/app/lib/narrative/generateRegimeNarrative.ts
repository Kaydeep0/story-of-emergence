import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';

export type NarrativeFragment = {
  id: string;
  text: string; // Max 2 sentences, neutral tone, observational only
};

export type RegimeNarrativeSignals = {
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  regime: Regime;
  currentPeriod: string;
};

/**
 * Generate narrative for deterministic regime
 * Describes stability and repetition
 * No mention of change or momentum
 * May return null if no meaningful narrative
 */
function generateDeterministicNarrative(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): NarrativeFragment | null {
  if (clusters.length === 0) {
    return null;
  }

  // If clusters are stable across multiple periods, describe repetition
  const multiPeriodClusters = clusters.filter(c => c.sourcePeriods.length >= 2);
  if (multiPeriodClusters.length >= 2) {
    return {
      id: 'deterministic-stability',
      text: 'These patterns have tended to repeat across periods. The structure has remained consistent.',
    };
  }

  // If associations are stable, describe interaction
  if (associations.length >= 2) {
    return {
      id: 'deterministic-interaction',
      text: 'These clusters have interacted with each other consistently. The relationships have tended to persist.',
    };
  }

  // If only one cluster, describe its persistence
  if (clusters.length === 1 && clusters[0].sourcePeriods.length >= 2) {
    return {
      id: 'deterministic-persistence',
      text: 'This pattern has appeared across multiple periods. The structure has remained stable.',
    };
  }

  // Return null if no meaningful narrative can be formed
  return null;
}

/**
 * Generate narrative for transitional regime
 * Describes mutual influence
 * Describes instability or variation
 * No resolution language
 */
function generateTransitionalNarrative(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): NarrativeFragment | null {
  if (clusters.length < 2) {
    return null;
  }

  // If associations are changing, describe mutual influence
  if (associations.length > 0) {
    return {
      id: 'transitional-influence',
      text: 'These clusters have begun to interact with each other in varied ways. The relationships appear to shift across periods.',
    };
  }

  // If many clusters, describe variation
  if (clusters.length >= 3) {
    return {
      id: 'transitional-variation',
      text: 'The structure has tended to vary across periods. Multiple themes have appeared and interacted.',
    };
  }

  // If clusters are appearing/disappearing, describe instability
  const fadedClusters = clusters.filter(c => c.faded);
  if (fadedClusters.length > 0 && clusters.length >= 2) {
    return {
      id: 'transitional-instability',
      text: 'Some patterns have appeared while others have faded. The structure has begun to change.',
    };
  }

  // Default transitional narrative
  return {
    id: 'transitional-default',
    text: 'The observer-environment relationship has tended to shift. Patterns have appeared to vary across periods.',
  };
}

/**
 * Generate narrative for emergent regime
 * Describes asymmetry or dominance
 * Describes nonlinear shaping
 * No celebration language
 */
function generateEmergentNarrative(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): NarrativeFragment | null {
  if (clusters.length === 0) {
    return null;
  }

  // Sort by dominance
  const sortedClusters = [...clusters].sort(
    (a, b) => b.sourcePeriods.length - a.sourcePeriods.length
  );

  // If strong dominance exists, describe asymmetry
  if (sortedClusters.length >= 1 && sortedClusters[0].sourcePeriods.length > 2) {
    if (sortedClusters.length === 1) {
      return {
        id: 'emergent-dominance',
        text: 'A single pattern has begun to dominate the structure. The observer-environment relationship has tended toward asymmetry.',
      };
    }

    if (sortedClusters.length === 2) {
      const topCluster = sortedClusters[0];
      const secondCluster = sortedClusters[1];
      
      if (topCluster.sourcePeriods.length > secondCluster.sourcePeriods.length * 1.5) {
        return {
          id: 'emergent-asymmetry',
          text: 'One pattern has begun to shape the structure more than others. The relationship has tended toward nonlinear distribution.',
        };
      }
    }
  }

  // If few associations, describe isolation
  if (associations.length === 0 && sortedClusters.length <= 2) {
    return {
      id: 'emergent-isolation',
      text: 'Distinct patterns have appeared without strong connections. The structure has begun to form around isolated regions.',
    };
  }

  // Default emergent narrative
  return {
    id: 'emergent-default',
    text: 'The observer-environment relationship has begun to reshape itself. Patterns have appeared to concentrate in specific regions.',
  };
}

/**
 * Generate regime-shaped narrative projection
 * Narrative is compression of observed structure across time
 * Not instruction, advice, evaluation, or direction
 * Does not collapse multiplicity
 * 
 * NarrativeFragment:
 * - Max 2 sentences
 * - Neutral tone
 * - Observational only
 * - Past and present focused
 * - No future claims
 */
export function generateRegimeNarrative(signals: RegimeNarrativeSignals): NarrativeFragment | null {
  const { clusters, associations, regime, currentPeriod } = signals;

  // Apply silence rules - need at least 2 clusters for meaningful narrative
  if (clusters.length < 2 && regime !== 'emergent') {
    return null;
  }

  // Generate narrative based on regime
  switch (regime) {
    case 'deterministic':
      return generateDeterministicNarrative(clusters, associations);

    case 'transitional':
      return generateTransitionalNarrative(clusters, associations);

    case 'emergent':
      return generateEmergentNarrative(clusters, associations);

    default:
      return null;
  }
}

