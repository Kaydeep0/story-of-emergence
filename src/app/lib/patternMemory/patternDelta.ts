// src/app/lib/patternMemory/patternDelta.ts
// Pattern delta analysis layer
// Phase 5.2: Semantic interpretation of pattern changes over time

import type { InsightPatternKind } from '../insights/patternModel';
import type { PatternSnapshot } from './patternSnapshot';

/**
 * Pattern delta - semantic interpretation of pattern changes
 * 
 * This represents how a pattern has changed between two snapshot points.
 * This is semantic interpretation - enables narrative intelligence.
 * UI and storage come later.
 * 
 * Phase 5.2: Read-only analysis - no side effects, no storage, no UI.
 */
export type PatternDelta = {
  /** Stable pattern ID */
  id: string;
  /** Pattern kind classification */
  kind: InsightPatternKind;
  /** Semantic delta type describing the pattern's change */
  deltaType: 'emergent' | 'persistent' | 'strengthening' | 'fading' | 'stable';
  /** Previous strength value (0-1) if available */
  previousStrength?: number;
  /** Current strength value (0-1) if available */
  currentStrength?: number;
  /** Number of occurrences (from current snapshot) */
  occurrenceCount: number;
};

/**
 * Analyze pattern deltas between previous and current snapshots
 * 
 * This is a pure function that compares two sets of pattern snapshots
 * and emits semantic deltas describing how patterns have changed.
 * 
 * This enables narrative intelligence - understanding pattern emergence,
 * persistence, strengthening, and fading over time.
 * 
 * Phase 5.2: Semantic interpretation layer - no side effects, no storage, no UI.
 * 
 * @param previous - Previous pattern snapshots (can be empty for first analysis)
 * @param current - Current pattern snapshots
 * @returns Array of pattern deltas describing changes
 */
export function analyzePatternDeltas(
  previous: PatternSnapshot[],
  current: PatternSnapshot[]
): PatternDelta[] {
  // Create maps for efficient lookup
  const previousMap = new Map<string, PatternSnapshot>();
  for (const snapshot of previous) {
    previousMap.set(snapshot.id, snapshot);
  }
  
  const currentMap = new Map<string, PatternSnapshot>();
  for (const snapshot of current) {
    currentMap.set(snapshot.id, snapshot);
  }
  
  const deltas: PatternDelta[] = [];
  
  // Analyze each current pattern
  for (const currentSnapshot of current) {
    const previousSnapshot = previousMap.get(currentSnapshot.id);
    
    let deltaType: PatternDelta['deltaType'];
    
    if (!previousSnapshot) {
      // Pattern is new - emergent
      deltaType = 'emergent';
    } else {
      // Pattern exists in both - analyze change
      const occurrenceCount = currentSnapshot.occurrences;
      const previousStrength = previousSnapshot.lastStrength;
      const currentStrength = currentSnapshot.lastStrength;
      
      // Check for persistence (appeared in 3+ windows)
      if (occurrenceCount >= 3) {
        deltaType = 'persistent';
      }
      // Check for strengthening (significant increase in strength)
      else if (
        previousStrength !== undefined &&
        currentStrength !== undefined &&
        currentStrength > previousStrength &&
        (currentStrength - previousStrength) >= 0.2
      ) {
        deltaType = 'strengthening';
      }
      // Check for fading (strength decreased or pattern missing)
      else if (
        previousStrength !== undefined &&
        (currentStrength === undefined || currentStrength < previousStrength)
      ) {
        deltaType = 'fading';
      }
      // Default to stable (no significant change)
      else {
        deltaType = 'stable';
      }
    }
    
    deltas.push({
      id: currentSnapshot.id,
      kind: currentSnapshot.kind,
      deltaType,
      previousStrength: previousSnapshot?.lastStrength,
      currentStrength: currentSnapshot.lastStrength,
      occurrenceCount: currentSnapshot.occurrences,
    });
  }
  
  // Also check for patterns that faded completely (in previous but not current)
  for (const previousSnapshot of previous) {
    if (!currentMap.has(previousSnapshot.id)) {
      // Pattern was present before but is now missing - fading
      deltas.push({
        id: previousSnapshot.id,
        kind: previousSnapshot.kind,
        deltaType: 'fading',
        previousStrength: previousSnapshot.lastStrength,
        currentStrength: undefined,
        occurrenceCount: previousSnapshot.occurrences,
      });
    }
  }
  
  return deltas;
}

