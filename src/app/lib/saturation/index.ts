/**
 * Emergence Saturation Ceiling Module
 * 
 * Ensures that even with continuous genuine novelty, the system enforces
 * a hard ceiling on concurrent meaning, preventing runaway emergence,
 * over-interpretation, or conceptual inflation.
 * 
 * Firewall intact:
 * - UI cannot influence saturation
 * - Observer trace excluded
 * - Inference-only logic
 * - No user control: no pinning, locking, or prioritization from UI
 */

export type {
  MeaningNode,
  SaturationState,
  SaturationSignals,
} from './computeSaturationCeiling';

export {
  computeSaturationCeiling,
  shouldSuppressDueToSaturation,
  getActiveMeaningNodes,
} from './computeSaturationCeiling';

