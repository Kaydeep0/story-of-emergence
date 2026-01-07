// src/app/lib/observer/attachPersistence.ts
// Observer v1: Attach pattern persistence to artifacts
// Shared pipeline function that compares artifacts and attaches persistence results

import type { InsightArtifact, InsightArtifactDebug } from '../insights/artifactTypes';
import { compareArtifactsForPersistence } from './compareArtifacts';
import type { ReflectionEntry } from '../insights/types';

/**
 * Cache key for artifact pairs
 * 
 * Combines wallet address and dataset version to create a stable key
 * that changes when the underlying data changes.
 */
type CacheKey = string;

/**
 * Cached artifact pair for a given wallet and dataset version
 */
type CachedPair = {
  weekly?: { artifact: InsightArtifact; reflections?: ReflectionEntry[] };
  yearly?: { artifact: InsightArtifact; reflections?: ReflectionEntry[] };
};

/**
 * Artifact cache for persistence comparison
 * 
 * Stores artifacts by cache key (wallet + dataset version) so they can be compared
 * when both are available. This allows Weekly and Yearly pages to compute their own
 * artifacts independently, then have persistence attached when the second artifact is computed.
 * 
 * Cache persists across navigation within the same session and resets when wallet changes.
 */
class ArtifactCache {
  private cache = new Map<CacheKey, CachedPair>();
  private lastAddress: string | null = null;

  /**
   * Make cache key from wallet address and dataset version
   */
  makeKey(address: string | null | undefined, datasetVersion: string | null | undefined): CacheKey {
    const addr = address ?? 'anon';
    const version = datasetVersion ?? 'unknown';
    return `${addr}::${version}`;
  }

  /**
   * Store an artifact for later comparison
   */
  store(
    key: CacheKey,
    horizon: 'weekly' | 'yearly',
    artifact: InsightArtifact,
    reflections?: ReflectionEntry[]
  ): void {
    if (!this.cache.has(key)) {
      this.cache.set(key, {});
    }
    const pair = this.cache.get(key)!;
    if (horizon === 'weekly') {
      pair.weekly = { artifact, reflections };
    } else {
      pair.yearly = { artifact, reflections };
    }
  }

  /**
   * Get stored artifact pair by key
   */
  getPair(key: CacheKey): CachedPair | undefined {
    return this.cache.get(key);
  }

  /**
   * Clear cache for a specific key
   */
  clearKey(key: CacheKey): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached artifacts
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if identity changed and reset cache if needed
   */
  resetIfIdentityChanged(address: string | null | undefined): void {
    const currentAddress = address ?? null;
    if (currentAddress !== this.lastAddress) {
      this.clear();
      this.lastAddress = currentAddress;
    }
  }
}

// Module-level cache instance (persists across navigation in same session)
const artifactCache = new ArtifactCache();

/**
 * Options for attaching persistence
 */
export type AttachPersistenceOptions = {
  /** Wallet address for cache key */
  address?: string | null;
  /** Dataset version for cache key (e.g., maxEventIso or windowEndIso) */
  datasetVersion?: string | null;
};

/**
 * Attach persistence to an artifact if comparison is possible
 * 
 * This function:
 * 1. Creates a cache key from address and dataset version
 * 2. Stores the artifact in cache under that key
 * 3. If both Weekly and Yearly are available for the same key, compares them
 * 4. Attaches persistence results to both artifacts
 * 5. Returns the updated artifact
 * 
 * @param artifact - The artifact to attach persistence to
 * @param reflections - Optional reflections for Weekly distribution computation
 * @param options - Cache key options (address, datasetVersion)
 * @returns Updated artifact with persistence attached (or original if silence applies)
 */
export function attachPersistenceToArtifact(
  artifact: InsightArtifact,
  reflections?: ReflectionEntry[],
  options?: AttachPersistenceOptions
): InsightArtifact {
  const { address, datasetVersion } = options || {};
  
  // Create cache key
  const cacheKey = artifactCache.makeKey(address, datasetVersion);
  
  // Initialize debug info
  let debug: {
    cacheKey?: string;
    weeklyInCache?: boolean;
    yearlyInCache?: boolean;
    weeklySignature: { observedDistributionFit: string; concentrationRatio: number } | null;
    yearlySignature: { observedDistributionFit: string; concentrationRatio: number } | null;
    match: boolean;
    silenceReason?: string;
  } = {
    cacheKey,
    weeklyInCache: false,
    yearlyInCache: false,
    weeklySignature: null,
    yearlySignature: null,
    match: false,
  };
  
  // Store artifact and reflections
  if (artifact.horizon === 'weekly' || artifact.horizon === 'yearly') {
    artifactCache.store(cacheKey, artifact.horizon, artifact, reflections);
  }

  // Get cached pair for this key
  const pair = artifactCache.getPair(cacheKey);
  
  // Update debug with cache state
  debug.weeklyInCache = !!pair?.weekly;
  debug.yearlyInCache = !!pair?.yearly;
  
  // Helper to ensure all required debug fields are present
  const ensureDebugFields = (base: typeof artifact.debug): InsightArtifactDebug => ({
    eventCount: base?.eventCount ?? 0,
    windowStartIso: base?.windowStartIso ?? artifact.window.start,
    windowEndIso: base?.windowEndIso ?? artifact.window.end,
    minEventIso: base?.minEventIso ?? null,
    maxEventIso: base?.maxEventIso ?? null,
    sampleEventIds: base?.sampleEventIds ?? [],
    sampleEventDates: base?.sampleEventDates ?? [],
    ...base,
  });

  // If we don't have both artifacts yet, return artifact as-is (persistence stays null)
  if (!pair || !pair.weekly || !pair.yearly) {
    debug.silenceReason = !pair?.weekly && !pair?.yearly 
      ? 'No artifacts in cache'
      : !pair?.weekly 
        ? 'Weekly artifact missing from cache'
        : 'Yearly artifact missing from cache';
    return {
      ...artifact,
      debug: {
        ...ensureDebugFields(artifact.debug),
        observerV1: debug,
      },
    };
  }

  // Get both artifacts
  const weeklyArtifact = pair.weekly.artifact;
  const yearlyArtifact = pair.yearly.artifact;

  // Enforce silence: require both artifacts
  if (!weeklyArtifact || !yearlyArtifact) {
    return artifact;
  }

  // Get reflections for Weekly (needed to compute distribution)
  const weeklyReflections = pair.weekly.reflections || reflections;
  
  // Compare artifacts
  const comparison = compareArtifactsForPersistence(
    weeklyArtifact,
    yearlyArtifact,
    weeklyReflections
  );

  // If comparison returned null (silence), return artifact with debug info
  if (!comparison) {
    debug.match = false;
    debug.silenceReason = 'Pattern comparison returned null (silence rule triggered)';
    return {
      ...artifact,
      debug: {
        ...ensureDebugFields(artifact.debug),
        observerV1: {
          ...debug,
          weeklySignature: null, // Will be populated by compareArtifactsForPersistence if it runs
          yearlySignature: null,
        },
      },
    };
  }

  // Merge cache state into comparison debug
  const mergedDebug = {
    ...comparison.debug,
    cacheKey,
    weeklyInCache: true,
    yearlyInCache: true,
  };
  
  // Update cached artifacts with persistence results
  if (artifact.horizon === 'weekly') {
    const updated = {
      ...comparison.weekly,
      debug: {
        ...ensureDebugFields(artifact.debug),
        observerV1: mergedDebug,
      },
    };
    // Update cache
    artifactCache.store(cacheKey, 'weekly', updated, weeklyReflections);
    return updated;
  } else if (artifact.horizon === 'yearly') {
    const updated = {
      ...comparison.yearly,
      debug: {
        ...ensureDebugFields(artifact.debug),
        observerV1: mergedDebug,
      },
    };
    // Update cache
    artifactCache.store(cacheKey, 'yearly', updated, reflections);
    return updated;
  }

  // For other horizons, return as-is with debug
  return {
    ...artifact,
    debug: {
      ...ensureDebugFields(artifact.debug),
      observerV1: debug,
    },
  };
}

/**
 * Reset persistence cache if wallet identity changed
 * 
 * Call this when wallet address changes to prevent cross-wallet contamination.
 * 
 * @param address - Current wallet address
 */
export function resetPersistenceCacheIfIdentityChanged(address?: string | null): void {
  artifactCache.resetIfIdentityChanged(address);
}

