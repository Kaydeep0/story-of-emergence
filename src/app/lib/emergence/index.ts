/**
 * Emergence Phase Transition Detection Module
 * 
 * Detects when the system undergoes a qualitative shift between
 * silence-dominant, meaning-sparse, and meaning-dense regimes.
 * 
 * This is a read-only classification system that does not influence
 * inference, decay, novelty, or saturation logic.
 * 
 * Firewall preserved:
 * - UI cannot read regime directly
 * - Observer trace excluded
 * - Regime cannot influence meaning survival or collapse
 */

export type {
  EmergenceRegime,
  EmergenceRegimeSignals,
} from './detectEmergenceRegime';

export {
  detectEmergenceRegime,
  getRegimeDescription,
} from './detectEmergenceRegime';

export type {
  RegimeDwellState,
  DwellTimeSignals,
} from './trackRegimeDwellTime';

export {
  trackRegimeDwellTime,
  getDwellDurationMs,
  getDwellDurationSeconds,
  getDwellDurationMinutes,
} from './trackRegimeDwellTime';

