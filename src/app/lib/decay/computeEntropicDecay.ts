/**
 * Meaning Decay & Entropic Return
 * 
 * Ensures that even sustained meaning naturally decays back into silence
 * unless continuously reinforced by new evidence.
 * 
 * Core rule: Meaning is temporary. Silence always wins.
 * 
 * Requirements:
 * - Meaning strength weakens over time
 * - Decay applies even if meaning persists
 * - No permanent meaning allowed within a session
 * - Decay is structural, not emotional
 * - Deterministic: same input → same decay curve
 * - Decay is a function of time and density only
 * - Observer trace does not affect decay
 * - Once decay threshold is crossed, meaning collapses, silence resumes
 * - Decay logic cannot be influenced by UI
 * - Only new reflections can reinforce meaning
 * - Session scoped: decay resets on new wallet session
 */

import type { ReflectionEntry } from '../insights/types';

export type EntropicDecayState = {
  decayFactor: number; // 0-1, where 1 = full meaning, 0 = complete decay
  isDecayed: boolean; // true when decay threshold crossed
  timeSinceLastReinforcement: number; // milliseconds
  sessionStart: string; // ISO timestamp
};

export type DecaySignals = {
  reflections: ReflectionEntry[];
  sessionStart: string; // ISO timestamp
  currentTime: string; // ISO timestamp
  previousDecayState?: EntropicDecayState | null;
};

/**
 * Compute entropic decay state
 * 
 * Decay model:
 * - Meaning strength decays exponentially over time
 * - Decay rate depends on reflection density (sparse = faster decay)
 * - New reflections reinforce meaning (reset decay timer)
 * - Once decay factor drops below threshold, meaning collapses
 * 
 * Deterministic: same reflections + same time → same decay factor
 * Session-scoped: decay resets on new wallet session
 * 
 * @param signals - Decay computation signals
 * @returns EntropicDecayState
 */
export function computeEntropicDecay(signals: DecaySignals): EntropicDecayState {
  const { reflections, sessionStart, currentTime, previousDecayState } = signals;

  // Filter out deleted reflections
  const activeReflections = reflections.filter(r => !r.deletedAt);
  
  if (activeReflections.length === 0) {
    // No reflections = complete decay
    return {
      decayFactor: 0,
      isDecayed: true,
      timeSinceLastReinforcement: 0,
      sessionStart,
    };
  }

  // Sort reflections by creation date
  const sortedReflections = [...activeReflections].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const sessionStartTime = new Date(sessionStart).getTime();
  const currentTimeMs = new Date(currentTime).getTime();
  const sessionDuration = currentTimeMs - sessionStartTime;

  // Find most recent reflection (last reinforcement)
  const mostRecentReflection = sortedReflections[sortedReflections.length - 1];
  const mostRecentTime = new Date(mostRecentReflection.createdAt).getTime();
  const timeSinceLastReinforcement = currentTimeMs - mostRecentTime;

  // Compute reflection density (reflections per day over session)
  const daysSinceSessionStart = Math.max(sessionDuration / (1000 * 60 * 60 * 24), 0.1);
  const reflectionDensity = activeReflections.length / daysSinceSessionStart;

  // Decay parameters
  // Decay rate depends on reflection density (sparse = faster decay)
  const DENSITY_DECAY_MODIFIER = Math.max(0.5, Math.min(2.0, 1.0 / Math.max(reflectionDensity, 0.1)));
  const DECAY_THRESHOLD = 0.3; // Below this, meaning collapses
  
  // Base decay rate: meaning halves every 7 days for normal density
  // Adjusted by density modifier (sparse = faster decay)
  const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const decayRate = (Math.log(2) / HALF_LIFE_MS) * DENSITY_DECAY_MODIFIER;

  // Check if there are new reflections (recent reinforcement)
  // New reflections reinforce meaning (reset decay timer)
  const REINFORCEMENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  const hasRecentReinforcement = timeSinceLastReinforcement < REINFORCEMENT_WINDOW_MS;

  // Compute decay factor
  // Start from 1.0 if recent reinforcement, otherwise decay from 1.0
  let decayFactor: number;
  if (hasRecentReinforcement) {
    // Recent reinforcement - meaning is at full strength
    decayFactor = 1.0;
  } else {
    // Compute exponential decay from full strength
    // decayFactor = e^(-decayRate * timeSinceLastReinforcement)
    decayFactor = Math.exp(-decayRate * timeSinceLastReinforcement);
  }

  // Clamp decay factor to [0, 1]
  decayFactor = Math.max(0, Math.min(1, decayFactor));

  // Check if decay threshold crossed
  const isDecayed = decayFactor < DECAY_THRESHOLD;

  return {
    decayFactor,
    isDecayed,
    timeSinceLastReinforcement,
    sessionStart,
  };
}

/**
 * Check if meaning should be suppressed due to decay
 * 
 * @param decayState - Current decay state
 * @returns true if meaning should be suppressed
 */
export function shouldSuppressMeaning(decayState: EntropicDecayState): boolean {
  return decayState.isDecayed;
}

/**
 * Get decay-adjusted meaning strength
 * 
 * @param decayState - Current decay state
 * @param baseStrength - Base meaning strength (0-1)
 * @returns Adjusted strength accounting for decay
 */
export function getDecayAdjustedStrength(
  decayState: EntropicDecayState,
  baseStrength: number
): number {
  return baseStrength * decayState.decayFactor;
}

