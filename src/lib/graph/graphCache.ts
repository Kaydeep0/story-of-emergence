// src/lib/graph/graphCache.ts
// Encrypted cache for reflection graphs keyed by wallet + scope
// Layer 1: Signal layer - cache stores computed signals only

import { encryptJSON, decryptJSON } from '../crypto';
import { buildReflectionGraph, type Reflection, type Edge } from './buildReflectionGraph';

/**
 * Cache entry metadata (stored unencrypted for validation)
 */
type CacheMetadata = {
  reflectionIds: string[]; // Sorted list of reflection IDs used to build this graph
  computedAt: string; // ISO timestamp
  scope: string; // Cache scope identifier
};

/**
 * Full cache entry (metadata + encrypted edges)
 */
type CacheEntry = {
  metadata: CacheMetadata;
  ciphertext: string; // Encrypted edges array
};

/**
 * Get cache key for a wallet + scope combination
 */
function getCacheKey(walletAddress: string, scope: string = 'lifetime'): string {
  return `reflection_graph_${walletAddress.toLowerCase()}_${scope}`;
}

/**
 * Check if cached graph is still valid
 * A graph is invalid if:
 * - Reflection IDs have changed (new reflections added/removed)
 * - Cache is older than 12 hours
 */
function isCacheValid(
  cached: CacheMetadata,
  currentReflectionIds: string[]
): boolean {
  // Check age (12 hours)
  const age = Date.now() - new Date(cached.computedAt).getTime();
  const maxAge = 12 * 60 * 60 * 1000; // 12 hours
  if (age > maxAge) {
    return false;
  }
  
  // Check if reflection set has changed
  const cachedIds = new Set(cached.reflectionIds.sort());
  const currentIds = new Set(currentReflectionIds.sort());
  
  if (cachedIds.size !== currentIds.size) {
    return false;
  }
  
  for (const id of cachedIds) {
    if (!currentIds.has(id)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Load cached graph for a wallet + scope
 * Returns decrypted edges or null if cache miss/invalid
 */
export async function loadCachedGraph(
  walletAddress: string,
  sessionKey: globalThis.CryptoKey,
  scope: string = 'lifetime'
): Promise<Edge[] | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const key = getCacheKey(walletAddress, scope);
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }
    
    const entry = JSON.parse(stored) as CacheEntry;
    
    // Validate metadata
    if (!entry.metadata || !entry.ciphertext) {
      return null;
    }
    
    // Decrypt edges
    const edges = await decryptJSON(entry.ciphertext, sessionKey) as Edge[];
    
    if (!Array.isArray(edges)) {
      return null;
    }
    
    return edges;
  } catch (err) {
    console.error('[graphCache] Failed to load cached graph', err);
    return null;
  }
}

/**
 * Save graph to encrypted cache
 */
export async function saveCachedGraph(
  walletAddress: string,
  sessionKey: globalThis.CryptoKey,
  edges: Edge[],
  reflectionIds: string[],
  scope: string = 'lifetime'
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const key = getCacheKey(walletAddress, scope);
    
    // Encrypt edges
    const ciphertext = await encryptJSON(edges, sessionKey);
    
    const entry: CacheEntry = {
      metadata: {
        reflectionIds: [...reflectionIds].sort(),
        computedAt: new Date().toISOString(),
        scope,
      },
      ciphertext,
    };
    
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.error('[graphCache] Failed to save cached graph', err);
  }
}

/**
 * Get or build reflection graph with encrypted caching
 * 
 * @param walletAddress - Wallet address for cache keying
 * @param sessionKey - AES-GCM encryption key
 * @param reflections - Array of decrypted reflections
 * @param scope - Cache scope identifier (default: 'lifetime')
 * @param topK - Number of top connections per reflection (default: 6)
 * @returns Array of graph edges
 */
export async function getOrBuildGraph(
  walletAddress: string,
  sessionKey: globalThis.CryptoKey,
  reflections: Reflection[],
  scope: string = 'lifetime',
  topK: number = 6
): Promise<Edge[]> {
  if (reflections.length < 2) {
    return [];
  }
  
  const reflectionIds = reflections.map(r => r.id);
  
  // Try to load from cache
  const cached = await loadCachedGraph(walletAddress, sessionKey, scope);
  if (cached) {
    // Validate cache against current reflections
    try {
      const key = getCacheKey(walletAddress, scope);
      const stored = localStorage.getItem(key);
      if (stored) {
        const entry = JSON.parse(stored) as CacheEntry;
        if (entry.metadata && isCacheValid(entry.metadata, reflectionIds)) {
          return cached;
        }
      }
    } catch (err) {
      // Cache validation failed, rebuild
    }
  }
  
  // Build new graph
  const edges = buildReflectionGraph(reflections, topK);
  
  // Save to encrypted cache
  await saveCachedGraph(walletAddress, sessionKey, edges, reflectionIds, scope);
  
  return edges;
}

/**
 * Clear cached graph for a wallet + scope
 */
export function clearCachedGraph(
  walletAddress: string,
  scope: string = 'lifetime'
): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const key = getCacheKey(walletAddress, scope);
    localStorage.removeItem(key);
  } catch (err) {
    console.error('[graphCache] Failed to clear cached graph', err);
  }
}

/**
 * Clear all cached graphs for a wallet
 */
export function clearAllCachedGraphs(walletAddress: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const prefix = `reflection_graph_${walletAddress.toLowerCase()}_`;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('[graphCache] Failed to clear all cached graphs', err);
  }
}

