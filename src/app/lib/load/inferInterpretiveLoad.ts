import type { Regime } from '../regime/detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { ContinuityNote } from '../continuity/continuity';
import type { ObservationClosure } from '../closure/inferObservationClosure';
import type { FeedbackMode } from '../feedback/inferObserverEnvironmentFeedback';
import type { InitialConditions } from '../constraints/inferInitialConditions';
import type { EmergencePersistence } from '../emergence/inferEmergencePersistence';

export type InterpretiveLoad = 'minimal' | 'constrained' | 'saturated';

export type InterpretiveLoadSignals = {
  emergencePersistence: EmergencePersistence;
  structuralDeviationMagnitude: number;
  continuityNote: ContinuityNote | null;
  initialConditions: InitialConditions | null;
  feedbackMode: FeedbackMode;
  regime: Regime;
  closure: ObservationClosure;
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  previousLoad?: InterpretiveLoad | null;
};

/**
 * Calculate structural deviation magnitude from constraint baseline
 * Returns deviation ratio (0..1+)
 */
function calculateDeviationMagnitude(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  initialConditions: InitialConditions | null
): number {
  if (!initialConditions || clusters.length === 0) {
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

  const clusterCount = clusters.length;
  const clustersWithAssociations = new Set<string>();
  associations.forEach(a => {
    clustersWithAssociations.add(a.fromClusterId);
    clustersWithAssociations.add(a.toClusterId);
  });
  const associationDensity = clusterCount > 0
    ? clustersWithAssociations.size / clusterCount
    : 0;

  const clusterDeviationRatio = Math.abs(clusterCount - expectedClusterCount) / Math.max(expectedClusterCount, 1);
  const associationDeviationRatio = Math.abs(associationDensity - expectedAssociationDensity) / Math.max(expectedAssociationDensity, 0.1);

  return Math.max(clusterDeviationRatio, associationDeviationRatio);
}

/**
 * Infer interpretive load regulation
 * 
 * Interpretation is constrained by structure, not curiosity.
 * Even persistent emergence must remain sparse.
 * 
 * Hard constraints:
 * - Never allow more than 2 parallel interpretations
 * - Never increase load across periods without stronger evidence
 * - Collapse immediately resets load to minimal
 * - Closure forces minimal load
 * - Deterministic regimes bias toward minimal
 * 
 * Load rules:
 * - minimal: Allow silence or a single weak interpretation
 * - constrained: Allow limited multiplicity (max 2), suppress narrative expansion
 * - saturated: Allow compression only, no new interpretations introduced
 * 
 * This signal gates:
 * - narrative generation
 * - multiplicity count
 * - spatial density
 * - symbolic labeling
 * 
 * No UI changes. No user-facing copy.
 */
export function inferInterpretiveLoad(
  signals: InterpretiveLoadSignals
): InterpretiveLoad {
  const {
    emergencePersistence,
    structuralDeviationMagnitude,
    continuityNote,
    initialConditions,
    feedbackMode,
    regime,
    closure,
    clusters,
    associations,
    previousLoad,
  } = signals;

  // Hard constraint: Closure forces minimal load
  if (closure === 'closed') {
    return 'minimal';
  }

  // Hard constraint: Collapse immediately resets load to minimal
  if (emergencePersistence === 'collapsed') {
    return 'minimal';
  }

  // Hard constraint: Deterministic regimes bias toward minimal
  if (regime === 'deterministic') {
    // Only allow constrained if deviation is very high and persistence is strong
    if (emergencePersistence === 'persistent' && structuralDeviationMagnitude > 0.5) {
      return 'constrained';
    }
    return 'minimal';
  }

  // Hard constraint: Never increase load across periods without stronger evidence
  // If previous load was minimal, require strong evidence to move to constrained
  if (previousLoad === 'minimal') {
    // Require persistent emergence AND high deviation AND continuity
    if (emergencePersistence === 'persistent' && 
        structuralDeviationMagnitude > 0.4 && 
        continuityNote !== null) {
      return 'constrained';
    }
    return 'minimal';
  }

  // If previous load was constrained, check if we should stay or reduce
  if (previousLoad === 'constrained') {
    // Stay constrained only if persistence remains and deviation is maintained
    if (emergencePersistence === 'persistent' && 
        structuralDeviationMagnitude > 0.3 && 
        continuityNote !== null) {
      // Check if we should saturate (extremely rare)
      // Saturated requires: very high deviation, persistent emergence, observer-dominant feedback
      if (structuralDeviationMagnitude > 0.7 && 
          feedbackMode === 'OBSERVER_DOMINANT' &&
          clusters.length >= 3 &&
          associations.length >= 2) {
        return 'saturated';
      }
      return 'constrained';
    }
    // Reduce to minimal if persistence weakens or deviation drops
    return 'minimal';
  }

  // If previous load was saturated, check if we should reduce
  if (previousLoad === 'saturated') {
    // Stay saturated only if all conditions remain extremely strong
    if (emergencePersistence === 'persistent' && 
        structuralDeviationMagnitude > 0.7 && 
        feedbackMode === 'OBSERVER_DOMINANT' &&
        continuityNote !== null &&
        clusters.length >= 3 &&
        associations.length >= 2) {
      return 'saturated';
    }
    // Reduce to constrained if conditions weaken slightly
    if (emergencePersistence === 'persistent' && 
        structuralDeviationMagnitude > 0.3 && 
        continuityNote !== null) {
      return 'constrained';
    }
    // Reduce to minimal if conditions weaken significantly
    return 'minimal';
  }

  // No previous load (first period or reset)
  // Default to minimal, require strong evidence for constrained
  if (emergencePersistence === 'persistent' && 
      structuralDeviationMagnitude > 0.4 && 
      continuityNote !== null &&
      feedbackMode !== 'ENVIRONMENT_DOMINANT') {
    // Check for saturated (extremely rare - requires all conditions)
    if (structuralDeviationMagnitude > 0.7 && 
        feedbackMode === 'OBSERVER_DOMINANT' &&
        clusters.length >= 3 &&
        associations.length >= 2) {
      return 'saturated';
    }
    return 'constrained';
  }

  // Default: minimal
  // Most cases should resolve to minimal
  return 'minimal';
}

