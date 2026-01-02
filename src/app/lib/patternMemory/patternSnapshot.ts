// src/app/lib/patternMemory/patternSnapshot.ts
// Pattern memory snapshot layer
// Phase 5.1: Read-only memory scaffolding for pattern tracking

import type { InsightPatternKind, InsightPattern } from '../insights/patternModel';
import type { TimeWindowKind } from '../insights/timeWindows';

/**
 * Pattern memory snapshot
 * 
 * Tracks a pattern's history across time windows without storing raw data.
 * This is memory scaffolding - persistence layer comes later.
 * 
 * Phase 5.1: No behavior change guaranteed - this is read-only tracking.
 */
export type PatternSnapshot = {
  /** Stable pattern ID (from makePatternId) - same pattern = same ID across windows */
  id: string;
  /** Pattern kind classification */
  kind: InsightPatternKind;
  /** ISO date string when this pattern was first observed */
  firstSeen: string;
  /** ISO date string when this pattern was last observed */
  lastSeen: string;
  /** Number of time windows where this pattern appeared */
  occurrences: number;
  /** Most recent strength value (0-1) if available */
  lastStrength?: number;
  /** Time window types where this pattern was observed (e.g., ['week', 'month']) */
  windows: TimeWindowKind[];
};

/**
 * Update pattern memory snapshots with current patterns
 * 
 * This is a pure function that updates memory snapshots based on current patterns.
 * It does NOT persist to storage - that comes in a later phase.
 * 
 * Behavior:
 * - If pattern ID exists in previous snapshots → update lastSeen, increment occurrences, update lastStrength
 * - If pattern ID is new → create new snapshot with firstSeen = now
 * - Old snapshots are preserved (memory only grows, never shrinks)
 * 
 * Phase 5.1: Memory scaffolding - no side effects, no storage, no behavior change.
 * 
 * @param previous - Previous pattern snapshots (empty array for first run)
 * @param current - Current patterns extracted from artifact
 * @param currentWindowKind - The time window kind for current patterns (e.g., 'week', 'month')
 * @param currentTimestamp - ISO timestamp for current observation (defaults to now)
 * @returns Updated pattern snapshots array
 */
export function snapshotPatterns(
  previous: PatternSnapshot[],
  current: InsightPattern[],
  currentWindowKind: TimeWindowKind,
  currentTimestamp: string = new Date().toISOString()
): PatternSnapshot[] {
  // Create a map of existing snapshots by ID for efficient lookup
  const snapshotMap = new Map<string, PatternSnapshot>();
  for (const snapshot of previous) {
    snapshotMap.set(snapshot.id, snapshot);
  }
  
  // Process current patterns
  for (const pattern of current) {
    const existingSnapshot = snapshotMap.get(pattern.id);
    
    if (existingSnapshot) {
      // Pattern exists - update snapshot
      const updatedSnapshot: PatternSnapshot = {
        ...existingSnapshot,
        lastSeen: currentTimestamp,
        occurrences: existingSnapshot.occurrences + 1,
        lastStrength: pattern.strength ?? existingSnapshot.lastStrength,
        // Add current window kind if not already present
        windows: existingSnapshot.windows.includes(currentWindowKind)
          ? existingSnapshot.windows
          : [...existingSnapshot.windows, currentWindowKind],
      };
      snapshotMap.set(pattern.id, updatedSnapshot);
    } else {
      // New pattern - create snapshot
      const newSnapshot: PatternSnapshot = {
        id: pattern.id,
        kind: pattern.kind,
        firstSeen: currentTimestamp,
        lastSeen: currentTimestamp,
        occurrences: 1,
        lastStrength: pattern.strength,
        windows: [currentWindowKind],
      };
      snapshotMap.set(pattern.id, newSnapshot);
    }
  }
  
  // Return all snapshots (existing + updated + new)
  // Preserve snapshots that weren't seen in current patterns (memory only grows)
  return Array.from(snapshotMap.values());
}

