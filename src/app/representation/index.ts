/**
 * Representation Layer - Read-Only
 * 
 * Strictly separates inference from presentation.
 * 
 * Rules:
 * - No inference imports allowed
 * - No conditional logic that changes meaning
 * - No re-computation
 * - No fallback inference
 * - Deterministic mapping only
 * 
 * Representation can only consume finalized outputs.
 * It cannot condition, gate, alter, or feedback into inference.
 */

export type {
  YearlyWrapViewModel,
  FinalizedNarrative,
  FinalizedContinuation,
  FinalizedObserverPosition,
  FinalizedPositionalDrift,
  FinalizedConceptualCluster,
  FinalizedClusterAssociation,
  FinalizedContinuityNote,
  FinalizedSilenceState,
  FinalizedYearlyWrap,
} from './representationTypes';

export type { FinalizedInferenceOutputs } from './mapToViewModel';
export { mapToViewModel } from './mapToViewModel';

