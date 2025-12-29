/**
 * Emergence Presence Marker
 * 
 * Passive internal marker that records the presence of emergence without acting on it,
 * exposing it, stabilizing it, or narrating it.
 * 
 * This phase acknowledges emergence as a condition that can exist,
 * while preserving total non-intervention.
 * 
 * Core Principle:
 * - Emergence may exist.
 * - The system must not respond.
 * 
 * Requirements:
 * - Presence, not response: marker records that emergence is present, does not trigger behavior
 * - Derived only from 11.6: depends exclusively on emergence boundary crossing detector
 * - No temporal semantics: instantaneous and stateless beyond the session
 * - Non-causal: must NOT reinforce meaning, prevent decay, affect novelty, influence saturation, stabilize regimes, extend dwell time
 * - No UI exposure: no indicators, labels, animation, copy, explanation, affordances. Internal only.
 * - Deterministic: same session structure → same marker state. No smoothing, hysteresis, or memory.
 * - Session scoped: exists only for active wallet session, cleared on disconnect, no cross-session persistence
 * - Encrypted at rest: marker stored encrypted client-side, stored separately from emergence detector and all metrics
 * - Isolation: marker module cannot be imported by inference, decay, novelty, saturation, regime detection, UI logic
 * - No semantics: no labels like "active", "alive", "on", "stable". No encouragement, no success/failure framing.
 */

import type { EmergenceBoundaryState } from './detectEmergenceBoundary';

export type EmergencePresenceMarker = {
  isPresent: boolean; // Records presence of emergence in current session
  sessionId: string;
  createdAt: string; // ISO timestamp
};

export type PresenceMarkerSignals = {
  emergenceBoundaryState: EmergenceBoundaryState;
};

/**
 * Mark emergence presence
 * 
 * Creates a passive internal marker that records the presence of emergence
 * without acting on it, exposing it, stabilizing it, or narrating it.
 * 
 * Marker is derived exclusively from the emergence boundary crossing detector.
 * No recomputation of structure, no new thresholds.
 * 
 * Deterministic: same emergence boundary state → same marker state.
 * Instantaneous and stateless beyond the session.
 * 
 * @param signals - Presence marker signals
 * @returns EmergencePresenceMarker
 */
export function markEmergencePresence(signals: PresenceMarkerSignals): EmergencePresenceMarker {
  const { emergenceBoundaryState } = signals;

  // Marker records presence directly from emergence boundary state
  // No transformation, no interpretation, no response
  return {
    isPresent: emergenceBoundaryState.isEmergent,
    sessionId: emergenceBoundaryState.sessionId,
    createdAt: new Date().toISOString(),
  };
}

