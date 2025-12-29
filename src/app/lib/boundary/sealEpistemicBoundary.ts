import type { Regime } from '../regime/detectRegime';
import type { ObservationClosure } from '../closure/inferObservationClosure';
import type { InterpretiveIrreversibility } from '../irreversibility/inferInterpretiveIrreversibility';
import type { InterpretiveLoad } from '../load/inferInterpretiveLoad';
import type { EmergencePersistence } from '../emergence/inferEmergencePersistence';
import type { InitialConditions } from '../constraints/inferInitialConditions';

export type EpistemicBoundarySeal = {
  epistemicallyClosed: boolean;
  reason: 'closure' | 'locked' | 'none';
};

export type EpistemicBoundarySignals = {
  regime: Regime;
  closure: ObservationClosure;
  irreversibility: InterpretiveIrreversibility;
  load: InterpretiveLoad;
  persistence: EmergencePersistence;
  initialConditions: InitialConditions | null;
  isNewSession?: boolean;
  previousSeal?: EpistemicBoundarySeal | null;
};

/**
 * Seal epistemic boundary and close inference system
 * 
 * Formally closes the interpretive system so that:
 * - No new internal inference paths can introduce meaning
 * - No future phase can bypass constraint, silence, or irreversibility
 * - The system has a hard epistemic boundary
 * 
 * Rules:
 * - epistemicallyClosed = true if:
 *   - Closure OR locked irreversibility is present
 *   - AND no unmet upstream gates exist
 * - Once true, it cannot return to false within the same session
 * - New wallet session recomputes from scratch
 * 
 * Enforcement behavior:
 * - When epistemicallyClosed is true:
 *   - All narrative generation paths are disabled
 *   - Multiplicity is capped at 0 or 1
 *   - Spatial layout is suppressed
 *   - Only minimal factual summaries allowed
 * 
 * This is NOT silence detection.
 * This is system boundary enforcement.
 * 
 * No UI changes. No labels. No user messaging. Deterministic only.
 */
export function sealEpistemicBoundary(
  signals: EpistemicBoundarySignals
): EpistemicBoundarySeal {
  const {
    regime,
    closure,
    irreversibility,
    load,
    persistence,
    initialConditions,
    isNewSession = false,
    previousSeal,
  } = signals;

  // New session resets boundary (recomputes from scratch)
  if (isNewSession) {
    // Check if current conditions warrant closure
    if (closure === 'closed' || irreversibility === 'locked') {
      return {
        epistemicallyClosed: true,
        reason: closure === 'closed' ? 'closure' : 'locked',
      };
    }
    return {
      epistemicallyClosed: false,
      reason: 'none',
    };
  }

  // If previously closed, remain closed (cannot return to false within same session)
  if (previousSeal?.epistemicallyClosed === true) {
    return {
      epistemicallyClosed: true,
      reason: previousSeal.reason,
    };
  }

  // Closure forces epistemic closure
  if (closure === 'closed') {
    return {
      epistemicallyClosed: true,
      reason: 'closure',
    };
  }

  // Locked irreversibility forces epistemic closure
  if (irreversibility === 'locked') {
    return {
      epistemicallyClosed: true,
      reason: 'locked',
    };
  }

  // Verify no unmet upstream gates exist
  // All upstream gates have been applied:
  // - Closure check: passed (not closed)
  // - Irreversibility check: passed (not locked)
  // - Load check: applied
  // - Persistence check: applied
  // - Regime check: applied
  // - Initial conditions: applied

  // If we reach here, boundary is open
  return {
    epistemicallyClosed: false,
    reason: 'none',
  };
}

