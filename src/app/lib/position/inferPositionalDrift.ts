import type { PositionDescriptor } from './inferObserverPosition';
import type { Regime } from '../regime/detectRegime';

export type DriftDescriptor = {
  id: string;
  phrase: string; // One short phrase, max 6 words, neutral comparative language
};

export type PositionalDriftSignals = {
  previous: PositionDescriptor | null;
  current: PositionDescriptor | null;
  previousRegime: Regime;
  currentRegime: Regime;
};

/**
 * Check if two positions are identical
 * Returns true if positions are the same
 */
function arePositionsIdentical(
  previous: PositionDescriptor | null,
  current: PositionDescriptor | null
): boolean {
  if (!previous || !current) {
    return false;
  }

  return previous.phrase === current.phrase;
}

/**
 * Generate drift phrase for deterministic → deterministic transition
 * Drift allowed only if position descriptors differ
 * No motion or direction language
 */
function generateDeterministicDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor
): DriftDescriptor {
  // If positions differ, describe the difference neutrally
  return {
    id: 'deterministic-drift',
    phrase: 'position differs',
  };
}

/**
 * Generate drift phrase for transitional → transitional transition
 * Drift allowed, but language must remain boundary-based
 */
function generateTransitionalDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor
): DriftDescriptor {
  // Check if boundary-related terms changed
  const previousHasBoundary = previous.phrase.includes('boundary') || previous.phrase.includes('edge') || previous.phrase.includes('between');
  const currentHasBoundary = current.phrase.includes('boundary') || current.phrase.includes('edge') || current.phrase.includes('between');

  if (previousHasBoundary !== currentHasBoundary) {
    return {
      id: 'transitional-boundary-change',
      phrase: 'boundary relationship changed',
    };
  }

  return {
    id: 'transitional-drift',
    phrase: 'shift in relative position',
  };
}

/**
 * Generate drift phrase for emergent → emergent transition
 * Drift allowed, but no shaping or outcome language
 */
function generateEmergentDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor
): DriftDescriptor {
  // Check if shaping-related terms changed
  const previousHasShaping = previous.phrase.includes('shaping') || previous.phrase.includes('emergent');
  const currentHasShaping = current.phrase.includes('shaping') || current.phrase.includes('emergent');

  if (previousHasShaping !== currentHasShaping) {
    return {
      id: 'emergent-structure-change',
      phrase: 'altered field relationship',
    };
  }

  return {
    id: 'emergent-drift',
    phrase: 'position differs',
  };
}

/**
 * Generate drift phrase for regime change transitions
 * Drift allowed, but phrasing must describe relationship change, not cause
 */
function generateRegimeChangeDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor,
  previousRegime: Regime,
  currentRegime: Regime
): DriftDescriptor {
  // Describe relationship change without implying cause or direction
  return {
    id: 'regime-change-drift',
    phrase: 'altered field relationship',
  };
}

/**
 * Infer positional drift across adjacent periods
 * Drift describes difference, not direction
 * It does not imply where the observer is going
 * It does not imply progress
 * It does not imply intent
 * 
 * DriftDescriptor:
 * - One short phrase
 * - Max 6 words
 * - Neutral comparative language
 * - No temporal direction
 */
export function inferPositionalDrift(signals: PositionalDriftSignals): DriftDescriptor | null {
  const { previous, current, previousRegime, currentRegime } = signals;

  // Silence rule: return null when either period has no position
  if (!previous || !current) {
    return null;
  }

  // Silence rule: return null when positions are identical
  if (arePositionsIdentical(previous, current)) {
    return null;
  }

  // Generate drift based on regime transitions
  if (previousRegime === currentRegime) {
    // Same regime transitions
    switch (currentRegime) {
      case 'deterministic':
        return generateDeterministicDrift(previous, current);

      case 'transitional':
        return generateTransitionalDrift(previous, current);

      case 'emergent':
        return generateEmergentDrift(previous, current);

      default:
        return null;
    }
  } else {
    // Regime change transitions
    return generateRegimeChangeDrift(previous, current, previousRegime, currentRegime);
  }
}

