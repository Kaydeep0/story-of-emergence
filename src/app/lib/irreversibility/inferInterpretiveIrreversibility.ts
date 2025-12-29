import type { Regime } from '../regime/detectRegime';
import type { ObservationClosure } from '../closure/inferObservationClosure';
import type { FeedbackMode } from '../feedback/inferObserverEnvironmentFeedback';
import type { EmergencePersistence } from '../emergence/inferEmergencePersistence';
import type { InterpretiveLoad } from '../load/inferInterpretiveLoad';

export type InterpretiveIrreversibility = 'open' | 'hardened' | 'locked';

export type InterpretiveIrreversibilitySignals = {
  currentLoad: InterpretiveLoad;
  currentPersistence: EmergencePersistence;
  regime: Regime;
  closure: ObservationClosure;
  feedbackMode: FeedbackMode;
  structuralDeviationMagnitude: number;
  continuityNote: { text: string } | null;
  previousPeriods?: Array<{
    persistence: EmergencePersistence;
    load: InterpretiveLoad;
    regime: Regime;
    closure: ObservationClosure;
  }>;
  isNewSession?: boolean; // True if this is a new wallet session (resets state)
};

/**
 * Infer interpretive irreversibility and memory lock
 * 
 * Ensures that once meaning collapses or is suppressed,
 * it cannot be reintroduced later without genuinely stronger evidence.
 * 
 * This prevents retroactive reinterpretation.
 * 
 * Rules:
 * - Any collapse sets state to hardened
 * - Repeated collapse sets state to locked
 * - Locked state can only reset on new initial conditions (new wallet session)
 * - Deterministic regimes bias toward hardened or locked
 * - Closure forces locked
 * 
 * System behavior:
 * - Locked suppresses narrative, multiplicity, and spatial layout
 * - Hardened allows interpretation only under extreme evidence
 * - Open behaves as Phase 9.3 rules
 * 
 * No UI changes. No user-facing indicators. Deterministic output only.
 */
export function inferInterpretiveIrreversibility(
  signals: InterpretiveIrreversibilitySignals
): InterpretiveIrreversibility {
  const {
    currentLoad,
    currentPersistence,
    regime,
    closure,
    feedbackMode,
    structuralDeviationMagnitude,
    continuityNote,
    previousPeriods,
    isNewSession = false,
  } = signals;

  // Reset on new session (new wallet session = new initial conditions)
  if (isNewSession) {
    // Check if current conditions warrant open state
    if (closure === 'closed' || currentPersistence === 'collapsed') {
      return 'hardened'; // Even new session starts hardened if collapse present
    }
    return 'open';
  }

  // Hard constraint: Closure forces locked
  if (closure === 'closed') {
    return 'locked';
  }

  // Hard constraint: Current collapse sets state to hardened
  if (currentPersistence === 'collapsed') {
    // Check if there was a previous collapse (repeated collapse = locked)
    if (previousPeriods && previousPeriods.length > 0) {
      const hasPreviousCollapse = previousPeriods.some(p => 
        p.persistence === 'collapsed' || p.closure === 'closed'
      );
      if (hasPreviousCollapse) {
        return 'locked'; // Repeated collapse
      }
    }
    return 'hardened'; // First collapse
  }

  // Hard constraint: Deterministic regimes bias toward hardened or locked
  if (regime === 'deterministic') {
    // Check if there was a previous collapse
    if (previousPeriods && previousPeriods.length > 0) {
      const hasPreviousCollapse = previousPeriods.some(p => 
        p.persistence === 'collapsed' || p.closure === 'closed'
      );
      if (hasPreviousCollapse) {
        return 'locked'; // Deterministic + previous collapse = locked
      }
    }
    // Deterministic without previous collapse = hardened (requires extreme evidence)
    return 'hardened';
  }

  // Check previous periods for collapse history
  if (previousPeriods && previousPeriods.length > 0) {
    // Count collapses in previous periods
    const collapseCount = previousPeriods.filter(p => 
      p.persistence === 'collapsed' || p.closure === 'closed'
    ).length;

    // Repeated collapse (2+ collapses) sets state to locked
    if (collapseCount >= 2) {
      return 'locked';
    }

    // Single previous collapse sets state to hardened
    if (collapseCount >= 1) {
      // Hardened allows interpretation only under extreme evidence
      // Extreme evidence requires:
      // - Persistent emergence (not transient)
      // - Very high structural deviation (>0.6)
      // - Strong continuity
      // - Observer-dominant feedback
      if (currentPersistence === 'persistent' &&
          structuralDeviationMagnitude > 0.6 &&
          continuityNote !== null &&
          feedbackMode === 'OBSERVER_DOMINANT' &&
          currentLoad !== 'minimal') {
        // Allow interpretation under extreme evidence, but stay hardened
        return 'hardened';
      }
      // Otherwise, stay hardened (suppress interpretation)
      return 'hardened';
    }

    // Check if previous periods had minimal load (silence)
    const hadMinimalLoad = previousPeriods.some(p => p.load === 'minimal');
    if (hadMinimalLoad && currentLoad === 'minimal') {
      // Silence is sticky: if previous period was minimal and current is minimal, stay hardened
      // This prevents oscillation between silence and meaning
      return 'hardened';
    }
  }

  // Default: open (normal interpretive thresholds apply)
  // This only happens if:
  // - No previous collapses
  // - Not deterministic
  // - Not closed
  // - Not collapsed
  return 'open';
}

