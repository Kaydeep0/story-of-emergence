import type { PositionDescriptor } from './inferObserverPosition';
import type { Regime } from '../regime/detectRegime';

export type DriftDescriptor = {
  id: string;
  phrase: string; // One sentence, max 12 words, neutral spatial language
};

/**
 * Position category classification
 * Drift is detected only when category changes, not phrasing variation
 */
type PositionCategory = 
  | 'constraint_proximity'      // Near constraints, at constraint
  | 'within_structure'           // Within structure, within patterns
  | 'boundary'                   // At boundary, along edge
  | 'between'                    // Between regions, between structures
  | 'shaping'                    // At shaping point, at edge
  | 'open'                       // In open structure, in emergent region
  | 'unknown';                   // Fallback

/**
 * Extract position category from position descriptor
 * Categories are based on semantic meaning, not exact phrasing
 */
function extractPositionCategory(
  position: PositionDescriptor,
  regime: Regime
): PositionCategory {
  const id = position.id.toLowerCase();
  const phrase = position.phrase.toLowerCase();

  switch (regime) {
    case 'deterministic':
      // Constraint proximity: near constraints, at constraint
      if (id.includes('constraint') || id.includes('single') || 
          phrase.includes('constraint') || phrase.includes('persistent')) {
        return 'constraint_proximity';
      }
      // Within structure: within structure, within patterns
      if (id.includes('structure') || id.includes('default') ||
          phrase.includes('structure') || phrase.includes('patterns')) {
        return 'within_structure';
      }
      return 'unknown';

    case 'transitional':
      // Boundary: at boundary, along edge
      if (id.includes('boundary') || id.includes('edge') ||
          phrase.includes('boundary') || phrase.includes('edge')) {
        return 'boundary';
      }
      // Between: between regions, between structures
      if (id.includes('between') || phrase.includes('between')) {
        return 'between';
      }
      return 'unknown';

    case 'emergent':
      // Shaping: at shaping point, at edge, asymmetry
      if (id.includes('shaping') || id.includes('asymmetry') || id.includes('edge') ||
          phrase.includes('shaping') || phrase.includes('edge') || phrase.includes('asymmetry')) {
        return 'shaping';
      }
      // Open: in open structure, in emergent region
      if (id.includes('open') || id.includes('emergent') || id.includes('default') ||
          phrase.includes('open') || phrase.includes('emergent') || phrase.includes('region')) {
        return 'open';
      }
      return 'unknown';

    default:
      return 'unknown';
  }
}

/**
 * Check if position categories are identical
 * Returns true if categories are the same (no drift)
 */
function areCategoriesIdentical(
  previous: PositionDescriptor | null,
  current: PositionDescriptor | null,
  previousRegime: Regime,
  currentRegime: Regime
): boolean {
  if (!previous || !current) {
    return false;
  }

  // If regimes differ, categories are never identical
  if (previousRegime !== currentRegime) {
    return false;
  }

  const prevCategory = extractPositionCategory(previous, previousRegime);
  const currCategory = extractPositionCategory(current, currentRegime);

  return prevCategory === currCategory && prevCategory !== 'unknown';
}

/**
 * Generate drift phrase for deterministic → deterministic transition
 * Emphasizes constraint stability
 * Max 12 words, neutral spatial language
 */
function generateDeterministicDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor,
  previousRegime: Regime,
  currentRegime: Regime
): DriftDescriptor {
  const prevCategory = extractPositionCategory(previous, previousRegime);
  const currCategory = extractPositionCategory(current, currentRegime);

  // Constraint proximity change
  if (prevCategory === 'constraint_proximity' && currCategory === 'within_structure') {
    return {
      id: 'deterministic-constraint-to-structure',
      phrase: 'Constraint proximity has changed',
    };
  }
  if (prevCategory === 'within_structure' && currCategory === 'constraint_proximity') {
    return {
      id: 'deterministic-structure-to-constraint',
      phrase: 'Relative position shifted within constraint field',
    };
  }

  // Default deterministic drift
  return {
    id: 'deterministic-drift',
    phrase: 'Field position differs from prior period',
  };
}

/**
 * Generate drift phrase for transitional → transitional transition
 * May reference boundary exposure or instability
 * Max 12 words, neutral spatial language
 */
function generateTransitionalDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor,
  previousRegime: Regime,
  currentRegime: Regime
): DriftDescriptor {
  const prevCategory = extractPositionCategory(previous, previousRegime);
  const currCategory = extractPositionCategory(current, currentRegime);

  // Boundary to between
  if (prevCategory === 'boundary' && currCategory === 'between') {
    return {
      id: 'transitional-boundary-to-between',
      phrase: 'Relative position shifted from boundary to between regions',
    };
  }
  if (prevCategory === 'between' && currCategory === 'boundary') {
    return {
      id: 'transitional-between-to-boundary',
      phrase: 'Boundary relationship changed',
    };
  }

  // Default transitional drift
  return {
    id: 'transitional-drift',
    phrase: 'Field position differs from prior period',
  };
}

/**
 * Generate drift phrase for emergent → emergent transition
 * May reference asymmetry or openness
 * Max 12 words, neutral spatial language
 */
function generateEmergentDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor,
  previousRegime: Regime,
  currentRegime: Regime
): DriftDescriptor {
  const prevCategory = extractPositionCategory(previous, previousRegime);
  const currCategory = extractPositionCategory(current, currentRegime);

  // Shaping to open
  if (prevCategory === 'shaping' && currCategory === 'open') {
    return {
      id: 'emergent-shaping-to-open',
      phrase: 'Relative position shifted from shaping point to open structure',
    };
  }
  if (prevCategory === 'open' && currCategory === 'shaping') {
    return {
      id: 'emergent-open-to-shaping',
      phrase: 'Field relationship altered from open to shaping',
    };
  }

  // Default emergent drift
  return {
    id: 'emergent-drift',
    phrase: 'Field position differs from prior period',
  };
}

/**
 * Generate drift phrase for regime change transitions
 * Describes relationship change, not cause or direction
 * Max 12 words, neutral spatial language
 */
function generateRegimeChangeDrift(
  previous: PositionDescriptor,
  current: PositionDescriptor,
  previousRegime: Regime,
  currentRegime: Regime
): DriftDescriptor {
  // Regime change always indicates structural position change
  // Use neutral language that describes the relationship shift
  
  // Deterministic → Transitional: constraint to boundary
  if (previousRegime === 'deterministic' && currentRegime === 'transitional') {
    return {
      id: 'regime-deterministic-to-transitional',
      phrase: 'Relative position shifted from constraint field to boundary',
    };
  }
  
  // Transitional → Deterministic: boundary to constraint
  if (previousRegime === 'transitional' && currentRegime === 'deterministic') {
    return {
      id: 'regime-transitional-to-deterministic',
      phrase: 'Field position differs from prior period',
    };
  }
  
  // Transitional → Emergent: boundary to shaping/open
  if (previousRegime === 'transitional' && currentRegime === 'emergent') {
    return {
      id: 'regime-transitional-to-emergent',
      phrase: 'Relative position shifted from boundary to emergent region',
    };
  }
  
  // Emergent → Transitional: shaping/open to boundary
  if (previousRegime === 'emergent' && currentRegime === 'transitional') {
    return {
      id: 'regime-emergent-to-transitional',
      phrase: 'Field relationship altered from emergent to boundary',
    };
  }
  
  // Deterministic → Emergent: constraint to shaping/open
  if (previousRegime === 'deterministic' && currentRegime === 'emergent') {
    return {
      id: 'regime-deterministic-to-emergent',
      phrase: 'Relative position shifted from constraint to emergent field',
    };
  }
  
  // Emergent → Deterministic: shaping/open to constraint
  if (previousRegime === 'emergent' && currentRegime === 'deterministic') {
    return {
      id: 'regime-emergent-to-deterministic',
      phrase: 'Field position differs from prior period',
    };
  }

  // Fallback for any other regime change
  return {
    id: 'regime-change-drift',
    phrase: 'Field relationship altered between periods',
  };
}

/**
 * Compute positional drift across adjacent periods
 * 
 * Drift does not imply motion, progress, regression, or intent.
 * It describes change in relative position caused by evolving observer–environment interaction.
 * 
 * Drift is detected only when position category changes, not phrasing variation.
 * 
 * Requirements:
 * - Returns null if either position is missing
 * - Returns null if positions are identical in regime and descriptor class
 * - Uses neutral spatial language only (max 12 words)
 * - Never implies direction, progress, success, or causality
 * - Regime-sensitive phrasing
 * 
 * @param signals - Previous and current positions with their regimes
 * @returns DriftDescriptor if meaningful change exists, null otherwise
 */
export function inferPositionalDrift(signals: {
  previous: PositionDescriptor | null;
  current: PositionDescriptor | null;
  previousRegime: Regime;
  currentRegime: Regime;
}): DriftDescriptor | null {
  const { previous, current, previousRegime, currentRegime } = signals;

  // Silence rule: return null when either period has no position
  if (!previous || !current) {
    return null;
  }

  // Silence rule: return null when positions are identical in regime and descriptor class
  if (areCategoriesIdentical(previous, current, previousRegime, currentRegime)) {
    return null;
  }

  // Generate drift based on regime transitions
  if (previousRegime === currentRegime) {
    // Same regime transitions
    switch (currentRegime) {
      case 'deterministic':
        return generateDeterministicDrift(previous, current, previousRegime, currentRegime);

      case 'transitional':
        return generateTransitionalDrift(previous, current, previousRegime, currentRegime);

      case 'emergent':
        return generateEmergentDrift(previous, current, previousRegime, currentRegime);

      default:
        return null;
    }
  } else {
    // Regime change transitions
    return generateRegimeChangeDrift(previous, current, previousRegime, currentRegime);
  }
}

