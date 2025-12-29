/**
 * Regime Stability & Dwell Time Encoding
 * 
 * Measures how long the system remains within a given emergence regime
 * without introducing momentum, narrative, or feedback effects.
 * 
 * This phase tracks persistence of state, not meaning.
 * 
 * Requirements:
 * - Dwell time tracking: entry timestamp, duration within current regime
 * - Read-only metric: must not influence inference, decay, novelty, saturation, collapse, or regime classification
 * - Deterministic behavior: same reflection history → same dwell times
 * - Session scoped: dwell time resets on new wallet session
 * - No narrative semantics: no labels, thresholds, or UI exposure
 * - Firewall preserved: UI cannot access dwell time, observer trace excluded
 */

import type { EmergenceRegime } from './detectEmergenceRegime';

export type RegimeDwellState = {
  currentRegime: EmergenceRegime;
  entryTimestamp: string; // ISO timestamp when current regime was entered
  sessionStart: string; // ISO timestamp of session start
  dwellDurationMs: number; // Milliseconds spent in current regime
};

export type DwellTimeSignals = {
  currentRegime: EmergenceRegime;
  sessionStart: string; // ISO timestamp of session start
  currentTime: string; // ISO timestamp of current time
  previousDwellState?: RegimeDwellState | null;
};

/**
 * Track regime dwell time
 * 
 * Computes how long the system has remained within the current regime.
 * This is a read-only metric that does not influence any system behavior.
 * 
 * Deterministic: same regime sequence → same dwell times
 * Session-scoped: resets on new wallet session
 * 
 * @param signals - Dwell time tracking signals
 * @returns RegimeDwellState
 */
export function trackRegimeDwellTime(signals: DwellTimeSignals): RegimeDwellState {
  const { currentRegime, sessionStart, currentTime, previousDwellState } = signals;

  const sessionStartTime = new Date(sessionStart).getTime();
  const currentTimeMs = new Date(currentTime).getTime();

  // Check if this is a new session (session start changed)
  const isNewSession = !previousDwellState || 
    previousDwellState.sessionStart !== sessionStart;

  // Check if regime has changed
  const regimeChanged = !previousDwellState || 
    previousDwellState.currentRegime !== currentRegime;

  if (isNewSession || regimeChanged) {
    // New session or regime change: reset dwell time
    return {
      currentRegime,
      entryTimestamp: currentTime, // Entered current regime at current time
      sessionStart,
      dwellDurationMs: 0, // Just entered, no dwell time yet
    };
  }

  // Same regime, same session: accumulate dwell time
  const entryTimeMs = new Date(previousDwellState.entryTimestamp).getTime();
  const dwellDurationMs = currentTimeMs - entryTimeMs;

  return {
    currentRegime,
    entryTimestamp: previousDwellState.entryTimestamp, // Keep original entry time
    sessionStart,
    dwellDurationMs,
  };
}

/**
 * Get dwell time in milliseconds
 * 
 * @param dwellState - Current dwell state
 * @returns Dwell duration in milliseconds
 */
export function getDwellDurationMs(dwellState: RegimeDwellState): number {
  return dwellState.dwellDurationMs;
}

/**
 * Get dwell time in seconds
 * 
 * @param dwellState - Current dwell state
 * @returns Dwell duration in seconds
 */
export function getDwellDurationSeconds(dwellState: RegimeDwellState): number {
  return dwellState.dwellDurationMs / 1000;
}

/**
 * Get dwell time in minutes
 * 
 * @param dwellState - Current dwell state
 * @returns Dwell duration in minutes
 */
export function getDwellDurationMinutes(dwellState: RegimeDwellState): number {
  return dwellState.dwellDurationMs / (1000 * 60);
}

