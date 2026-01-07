// src/app/lib/observer/attachPersistence.ts
// Observer v1: Attach pattern persistence to artifacts
// Shared pipeline function that compares artifacts and attaches persistence results

import type { InsightArtifact } from '../insights/artifactTypes';
import { compareArtifactsForPersistence } from './compareArtifacts';
import type { ReflectionEntry } from '../insights/types';

/**
 * Artifact cache for persistence comparison
 * 
 * Stores artifacts by horizon so they can be compared when both are available.
 * This allows Weekly and Yearly pages to compute their own artifacts independently,
 * then have persistence attached when the second artifact is computed.
 * 
 * NOTE: This is a module-level cache that persists across requests in the same process.
 * It should be cleared at the start of each page computation to prevent stale artifacts.
 */
class ArtifactCache {
  private artifacts = new Map<string, { artifact: InsightArtifact; reflections?: ReflectionEntry[] }>();

  /**
   * Store an artifact for later comparison
   */
  store(artifact: InsightArtifact, reflections?: ReflectionEntry[]): void {
    this.artifacts.set(artifact.horizon, { artifact, reflections });
  }

  /**
   * Get stored artifact by horizon
   */
  get(horizon: string): InsightArtifact | undefined {
    return this.artifacts.get(horizon)?.artifact;
  }

  /**
   * Get stored reflections for a horizon
   */
  getReflections(horizon: string): ReflectionEntry[] | undefined {
    return this.artifacts.get(horizon)?.reflections;
  }

  /**
   * Clear all stored artifacts
   */
  clear(): void {
    this.artifacts.clear();
  }

  /**
   * Check if both Weekly and Yearly artifacts are available
   */
  hasBoth(): boolean {
    return this.artifacts.has('weekly') && this.artifacts.has('yearly');
  }
}

// Module-level cache instance (persists across requests in same process)
const artifactCache = new ArtifactCache();

/**
 * Attach persistence to an artifact if comparison is possible
 * 
 * This function:
 * 1. Stores the artifact in cache
 * 2. If both Weekly and Yearly are available, compares them
 * 3. Attaches persistence results to both artifacts
 * 4. Returns the updated artifact
 * 
 * @param artifact - The artifact to attach persistence to
 * @param reflections - Optional reflections for Weekly distribution computation
 * @returns Updated artifact with persistence attached (or null if silence applies)
 */
export function attachPersistenceToArtifact(
  artifact: InsightArtifact,
  reflections?: ReflectionEntry[]
): InsightArtifact {
  // Store artifact and reflections
  artifactCache.store(artifact, reflections);

  // If we don't have both artifacts yet, return artifact as-is (persistence stays null)
  if (!artifactCache.hasBoth()) {
    return artifact;
  }

  // Get both artifacts
  const weeklyArtifact = artifactCache.get('weekly');
  const yearlyArtifact = artifactCache.get('yearly');

  // Enforce silence: require both artifacts
  if (!weeklyArtifact || !yearlyArtifact) {
    return artifact;
  }

  // Get reflections for Weekly (needed to compute distribution)
  const weeklyReflections = artifactCache.getReflections('weekly') || reflections;
  
  // Compare artifacts
  const comparison = compareArtifactsForPersistence(
    weeklyArtifact,
    yearlyArtifact,
    weeklyReflections
  );

  // If comparison returned null (silence), return artifact as-is
  if (!comparison) {
    return artifact;
  }

  // Attach persistence to the artifact that was passed in
  if (artifact.horizon === 'weekly') {
    return {
      ...comparison.weekly,
      debug: {
        ...artifact.debug,
        observerV1: comparison.debug,
      },
    };
  } else if (artifact.horizon === 'yearly') {
    return {
      ...comparison.yearly,
      debug: {
        ...artifact.debug,
        observerV1: comparison.debug,
      },
    };
  }

  // For other horizons, return as-is
  return artifact;
}

/**
 * Clear the artifact cache
 * 
 * Call this when starting a new request or session to prevent stale artifacts.
 */
export function clearArtifactCache(): void {
  artifactCache.clear();
}

