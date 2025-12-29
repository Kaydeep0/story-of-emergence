/**
 * Temporal Witness Module
 * 
 * Tracks temporal patterns without narrative, causality, or progression.
 * Strictly downstream - consumes inference outputs, does not influence inference.
 */

export type {
  TemporalWitness,
  TemporalDensityBand,
  TemporalSpacing,
  TemporalRecurrence,
} from './witnessTemporalPatterns';

export { witnessTemporalPatterns } from './witnessTemporalPatterns';

