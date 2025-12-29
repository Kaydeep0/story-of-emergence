/**
 * Representation Types - Read-Only View Models
 * 
 * These types represent finalized inference outputs ready for presentation.
 * They contain no inference logic and are purely structural.
 * 
 * Representation can only consume finalized outputs.
 * It cannot condition, gate, alter, or feedback into inference.
 */

export type FinalizedNarrative = {
  text: string;
} | null;

export type FinalizedContinuation = {
  id: string;
  text: string;
};

export type FinalizedObserverPosition = {
  phrase: string;
} | null;

export type FinalizedPositionalDrift = {
  phrase: string;
} | null;

export type FinalizedConceptualCluster = {
  id: string;
  label: string;
  description?: string;
  sourcePeriods: string[];
};

export type FinalizedClusterAssociation = {
  fromClusterId: string;
  toClusterId: string;
  periods: string[];
};

export type FinalizedContinuityNote = {
  text: string;
} | null;

export type FinalizedYearlyWrap = {
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
};

export type FinalizedSilenceState = {
  narrativeSuppressed: boolean;
  continuationsSuppressed: boolean;
  spatialLayoutSuppressed: boolean;
  observerPositionSuppressed: boolean;
  positionalDriftSuppressed: boolean;
};

export type YearlyWrapViewModel = {
  yearlyWrap: FinalizedYearlyWrap;
  narrative: FinalizedNarrative;
  continuations: FinalizedContinuation[];
  observerPosition: FinalizedObserverPosition;
  positionalDrift: FinalizedPositionalDrift;
  conceptualClusters: FinalizedConceptualCluster[];
  clusterAssociations: FinalizedClusterAssociation[];
  continuityNote: FinalizedContinuityNote;
  silenceState: FinalizedSilenceState;
};

