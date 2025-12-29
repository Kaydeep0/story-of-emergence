/**
 * Entropic Decay Module
 * 
 * Ensures that even sustained meaning naturally decays back into silence
 * unless continuously reinforced by new evidence.
 * 
 * Core rule: Meaning is temporary. Silence always wins.
 * 
 * Firewall preserved:
 * - Decay logic cannot be influenced by UI
 * - Cannot be paused, extended, or reversed by viewing
 * - Only new reflections can reinforce meaning
 */

export type {
  EntropicDecayState,
  DecaySignals,
} from './computeEntropicDecay';

export {
  computeEntropicDecay,
  shouldSuppressMeaning,
  getDecayAdjustedStrength,
} from './computeEntropicDecay';

