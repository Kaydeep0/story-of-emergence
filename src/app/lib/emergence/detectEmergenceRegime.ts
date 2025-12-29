/**
 * Emergence Phase Transition Detection
 * 
 * Detects when the system undergoes a qualitative shift between
 * silence-dominant, meaning-sparse, and meaning-dense regimes,
 * without introducing narrative, labels, or interpretation.
 * 
 * This phase classifies system state, not content.
 * 
 * Requirements:
 * - Regime classification: silence-dominant (0-1), sparse (2-4), dense (5-8)
 * - Read-only signal: does not influence inference, decay, novelty, or saturation
 * - No narrative semantics: no labels, explanations, progress indicators
 * - Deterministic transitions: same reflection set → same regime
 * - Firewall preserved: UI cannot read regime directly, observer trace excluded
 * - Silence neutrality: silence-dominant is not treated as failure
 */

export type EmergenceRegime = 'silence-dominant' | 'sparse-meaning' | 'dense-meaning';

export type EmergenceRegimeSignals = {
  activeMeaningNodeCount: number; // Number of active meaning nodes after saturation
};

/**
 * Detect emergence regime based on active meaning node count
 * 
 * Regime classification:
 * - Silence-dominant: 0–1 active meaning nodes
 * - Sparse meaning: 2–4 active meaning nodes
 * - Dense meaning: 5–8 active meaning nodes
 * 
 * Deterministic: same active node count → same regime
 * No hysteresis: regime changes immediately when thresholds are crossed
 * 
 * @param signals - Regime detection signals
 * @returns EmergenceRegime
 */
export function detectEmergenceRegime(signals: EmergenceRegimeSignals): EmergenceRegime {
  const { activeMeaningNodeCount } = signals;

  // Clamp to valid range (0-8)
  const clampedCount = Math.max(0, Math.min(8, activeMeaningNodeCount));

  // Regime classification based on active node count
  if (clampedCount <= 1) {
    return 'silence-dominant';
  } else if (clampedCount <= 4) {
    return 'sparse-meaning';
  } else {
    return 'dense-meaning';
  }
}

/**
 * Get regime description (internal only, not exposed to UI)
 * 
 * This is for debugging/logging purposes only.
 * Should not be rendered in UI.
 * 
 * @param regime - Emergence regime
 * @returns Human-readable description (internal use only)
 */
export function getRegimeDescription(regime: EmergenceRegime): string {
  switch (regime) {
    case 'silence-dominant':
      return 'silence-dominant';
    case 'sparse-meaning':
      return 'sparse-meaning';
    case 'dense-meaning':
      return 'dense-meaning';
  }
}

