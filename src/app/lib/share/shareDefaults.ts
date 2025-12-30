/**
 * Share Default Privacy Rules
 * 
 * These defaults are locked in code to ensure sharing is always intentional and safe.
 * 
 * Rules:
 * 1. Sharing is always opt-in (no auto-share)
 * 2. Only derived views can be shared (never raw reflections)
 * 3. Raw reflections are never shareable directly
 * 4. Shares are immutable snapshots, not live links
 */

export const SHARE_DEFAULTS = {
  // Sharing is always opt-in - no automatic sharing
  OPT_IN_ONLY: true,
  
  // Only derived/processed views can be shared
  // Raw reflections are never shareable directly
  DERIVED_VIEWS_ONLY: true,
  
  // Shares are immutable snapshots at creation time
  // They do not update if source data changes
  IMMUTABLE_SNAPSHOTS: true,
  
  // No live links - shares are static artifacts
  NO_LIVE_LINKS: true,
} as const;

/**
 * First-time explanation shown once, then disappears
 */
export const SHARE_FIRST_TIME_EXPLANATION = 
  "You control what leaves your vault. Only derived views can be shared, never raw reflections. Shares are immutable snapshots.";

