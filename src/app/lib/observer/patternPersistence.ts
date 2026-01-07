// src/app/lib/observer/patternPersistence.ts
// Observer v1: Pattern Persistence detection
// Pure function with strict types and no side effects

import type { PatternSignature } from './patternSignature';
import { samePattern } from './patternIdentity';

/**
 * Window metadata for persistence detection
 */
export type PersistenceWindow = {
  /** Lens name (e.g., 'weekly', 'yearly') */
  lens: string;
  
  /** Window start date (ISO string) */
  windowStart: string;
  
  /** Window end date (ISO string) */
  windowEnd: string;
  
  /** Pattern signature computed for this window */
  signature: PatternSignature | null;
};

/**
 * Pattern persistence recognition result
 * 
 * Minimal result object when a match exists.
 */
export type PatternPersistenceResult = {
  /** The pattern signature that persists */
  signature: PatternSignature;
  
  /** Lens names where the pattern appears */
  lenses: [string, string]; // Exactly two lenses
  
  /** Window start dates (ISO strings) */
  windowStarts: [string, string];
  
  /** Window end dates (ISO strings) */
  windowEnds: [string, string];
};

/**
 * Check if two date ranges overlap
 * 
 * Ranges overlap if they share any common date.
 */
function windowsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const startDateA = new Date(startA);
  const endDateA = new Date(endA);
  const startDateB = new Date(startB);
  const endDateB = new Date(endB);
  
  // Check for invalid dates
  if (isNaN(startDateA.getTime()) || isNaN(endDateA.getTime()) ||
      isNaN(startDateB.getTime()) || isNaN(endDateB.getTime())) {
    return false; // Can't determine overlap with invalid dates
  }
  
  // Ranges overlap if startA <= endB && startB <= endA
  return startDateA <= endDateB && startDateB <= endDateA;
}

/**
 * Detect pattern persistence across windows
 * 
 * Applies the persistence rule from docs/PATTERN_PERSISTENCE_RULE.md:
 * - Requires at least two non-overlapping windows
 * - Requires different lenses
 * - Returns null if any silence rule triggers
 * - Returns minimal result object if a match exists
 * 
 * @param windows - Array of windows with signatures
 * @returns PatternPersistenceResult or null if silence rule applies
 */
export function detectPatternPersistence(
  windows: PersistenceWindow[]
): PatternPersistenceResult | null {
  // Silence rule: require at least two windows
  if (!windows || windows.length < 2) {
    return null;
  }
  
  // Filter to windows with valid signatures
  const validWindows = windows.filter(w => w.signature !== null);
  
  // Silence rule: require at least two windows with valid signatures
  if (validWindows.length < 2) {
    return null;
  }
  
  // Try all pairs of windows
  for (let i = 0; i < validWindows.length; i++) {
    for (let j = i + 1; j < validWindows.length; j++) {
      const windowA = validWindows[i];
      const windowB = validWindows[j];
      
      // Silence rule: require different lenses
      if (windowA.lens === windowB.lens) {
        continue; // Skip this pair, try next
      }
      
      // Silence rule: require non-overlapping windows
      if (windowsOverlap(
        windowA.windowStart,
        windowA.windowEnd,
        windowB.windowStart,
        windowB.windowEnd
      )) {
        continue; // Skip this pair, try next
      }
      
      // Check if patterns match
      if (windowA.signature && windowB.signature &&
          samePattern(windowA.signature, windowB.signature)) {
        // Match found - return minimal result
        return {
          signature: windowA.signature,
          lenses: [windowA.lens, windowB.lens],
          windowStarts: [windowA.windowStart, windowB.windowStart],
          windowEnds: [windowA.windowEnd, windowB.windowEnd],
        };
      }
    }
  }
  
  // No match found - silence rule applies
  return null;
}

