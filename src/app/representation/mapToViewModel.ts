/**
 * Map to View Model - Pure Representation Mapping
 * 
 * This module maps finalized inference outputs to view models.
 * 
 * Rules:
 * - Pure functions only
 * - No inference logic
 * - No conditional logic that changes meaning
 * - No re-computation
 * - No fallback inference
 * - Deterministic mapping only
 * 
 * Same input always produces same view model.
 */

import type { YearlyWrapViewModel, FinalizedNarrative, FinalizedContinuation, FinalizedObserverPosition, FinalizedPositionalDrift, FinalizedConceptualCluster, FinalizedClusterAssociation, FinalizedContinuityNote, FinalizedSilenceState } from './representationTypes';

// Import only finalized output types, not inference functions
import type { ConceptualCluster, ClusterAssociation } from '../lib/clusters/conceptualClusters';
import type { ContinuityNote } from '../lib/continuity/continuity';
import type { YearlyWrap } from '../lib/wrap/yearlyWrap';
import type { NarrativeFragment } from '../lib/narrative/generateRegimeNarrative';
import type { Continuation } from '../lib/continuations/generateContinuations';
import type { PositionDescriptor } from '../lib/position/inferObserverPosition';
import type { DriftDescriptor } from '../lib/position/inferPositionalDrift';
import type { EpistemicBoundarySeal } from '../lib/boundary/sealEpistemicBoundary';
import type { ObservationClosure } from '../lib/closure/inferObservationClosure';

export type FinalizedInferenceOutputs = {
  yearlyWrap: YearlyWrap;
  narrative: NarrativeFragment | null;
  continuations: Continuation[];
  observerPosition: PositionDescriptor | null;
  positionalDrift: DriftDescriptor | null;
  conceptualClusters: ConceptualCluster[];
  clusterAssociations: ClusterAssociation[];
  continuityNote: ContinuityNote | null;
  epistemicBoundarySeal: EpistemicBoundarySeal;
  observationClosure: ObservationClosure;
};

/**
 * Map conceptual cluster to finalized representation
 */
function mapConceptualCluster(cluster: ConceptualCluster): FinalizedConceptualCluster {
  return {
    id: cluster.id,
    label: cluster.label,
    description: cluster.description, // Optional, can be undefined
    sourcePeriods: [...cluster.sourcePeriods], // Copy array
  };
}

/**
 * Map cluster association to finalized representation
 */
function mapClusterAssociation(association: ClusterAssociation): FinalizedClusterAssociation {
  return {
    fromClusterId: association.fromClusterId,
    toClusterId: association.toClusterId,
    periods: [...association.periods], // Copy array
  };
}

/**
 * Map continuity note to finalized representation
 */
function mapContinuityNote(note: ContinuityNote | null): FinalizedContinuityNote {
  if (!note) {
    return null;
  }
  return {
    text: note.text,
  };
}

/**
 * Map narrative to finalized representation
 */
function mapNarrative(narrative: NarrativeFragment | null): FinalizedNarrative {
  if (!narrative) {
    return null;
  }
  return {
    text: narrative.text,
  };
}

/**
 * Map continuation to finalized representation
 */
function mapContinuation(continuation: Continuation): FinalizedContinuation {
  return {
    id: continuation.id,
    text: continuation.text,
  };
}

/**
 * Map observer position to finalized representation
 */
function mapObserverPosition(position: PositionDescriptor | null): FinalizedObserverPosition {
  if (!position) {
    return null;
  }
  return {
    phrase: position.phrase,
  };
}

/**
 * Map positional drift to finalized representation
 */
function mapPositionalDrift(drift: DriftDescriptor | null): FinalizedPositionalDrift {
  if (!drift) {
    return null;
  }
  return {
    phrase: drift.phrase,
  };
}

/**
 * Map yearly wrap to finalized representation
 */
function mapYearlyWrap(wrap: YearlyWrap): {
  headline: string;
  summary: string;
  dominantPattern: string | null;
  keyMoments: Array<{
    id: string;
    headline: string;
    summary: string;
    label?: string;
  }>;
  shifts: Array<{
    id: string;
    headline: string;
    summary: string;
    direction: 'intensifying' | 'stabilizing' | 'fragmenting' | 'no_change';
  }>;
  densityLabel?: string;
  cadenceLabel?: string;
} {
  return {
    headline: wrap.headline,
    summary: wrap.summary,
    dominantPattern: wrap.dominantPattern ?? null,
    keyMoments: wrap.keyMoments.map(moment => ({
      id: moment.id,
      headline: moment.headline,
      summary: moment.summary,
      label: moment.label,
    })),
    shifts: wrap.shifts.map(shift => ({
      id: shift.id,
      headline: shift.headline,
      summary: shift.summary,
      direction: shift.direction,
    })),
    densityLabel: wrap.densityLabel,
    cadenceLabel: wrap.cadenceLabel,
  };
}

/**
 * Compute silence state from finalized outputs
 * 
 * This is pure mapping logic, not inference.
 * It determines what should be suppressed based on finalized states.
 */
function computeSilenceState(
  narrative: NarrativeFragment | null,
  continuations: Continuation[],
  observerPosition: PositionDescriptor | null,
  positionalDrift: DriftDescriptor | null,
  epistemicBoundarySeal: EpistemicBoundarySeal,
  observationClosure: ObservationClosure
): FinalizedSilenceState {
  return {
    narrativeSuppressed: narrative === null || epistemicBoundarySeal.epistemicallyClosed || observationClosure === 'closed',
    continuationsSuppressed: continuations.length === 0 || epistemicBoundarySeal.epistemicallyClosed || observationClosure === 'closed',
    spatialLayoutSuppressed: epistemicBoundarySeal.epistemicallyClosed || observationClosure === 'closed',
    observerPositionSuppressed: observerPosition === null || epistemicBoundarySeal.epistemicallyClosed || observationClosure === 'closed',
    positionalDriftSuppressed: positionalDrift === null || epistemicBoundarySeal.epistemicallyClosed || observationClosure === 'closed',
  };
}

/**
 * Map finalized inference outputs to view model
 * 
 * This is a pure function that transforms inference outputs into representation-ready view models.
 * No inference logic. No conditional meaning changes. Deterministic mapping only.
 */
export function mapToViewModel(outputs: FinalizedInferenceOutputs): YearlyWrapViewModel {
  return {
    yearlyWrap: mapYearlyWrap(outputs.yearlyWrap),
    narrative: mapNarrative(outputs.narrative),
    continuations: outputs.continuations.map(mapContinuation),
    observerPosition: mapObserverPosition(outputs.observerPosition),
    positionalDrift: mapPositionalDrift(outputs.positionalDrift),
    conceptualClusters: outputs.conceptualClusters.map(mapConceptualCluster),
    clusterAssociations: outputs.clusterAssociations.map(mapClusterAssociation),
    continuityNote: mapContinuityNote(outputs.continuityNote),
    silenceState: computeSilenceState(
      outputs.narrative,
      outputs.continuations,
      outputs.observerPosition,
      outputs.positionalDrift,
      outputs.epistemicBoundarySeal,
      outputs.observationClosure
    ),
  };
}

