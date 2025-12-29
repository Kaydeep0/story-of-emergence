/**
 * Store Structural Lineage Graph
 * 
 * Stores encrypted lineage graph in client-side storage.
 * Graph is encrypted before storage, server never sees structure.
 */

import type { EncryptedLineageGraph } from './encryptLineageGraph';

const STORAGE_KEY_PREFIX = 'soe_lineage_';

/**
 * Get storage key for lineage graph
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Storage key
 */
function getStorageKey(walletAddress: string, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}_${sessionId}`;
}

/**
 * Save encrypted lineage graph to localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @param encryptedGraph - Encrypted lineage graph
 */
export function saveLineageGraph(
  walletAddress: string,
  sessionId: string,
  encryptedGraph: EncryptedLineageGraph
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(encryptedGraph));
  } catch (err) {
    console.error('Failed to save lineage graph', err);
  }
}

/**
 * Load encrypted lineage graph from localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Encrypted lineage graph or null if not found
 */
export function loadLineageGraph(
  walletAddress: string,
  sessionId: string
): EncryptedLineageGraph | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored) as EncryptedLineageGraph;
  } catch (err) {
    console.error('Failed to load lineage graph', err);
    return null;
  }
}

/**
 * Clear lineage graph for a session
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 */
export function clearLineageGraph(
  walletAddress: string,
  sessionId: string
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.error('Failed to clear lineage graph', err);
  }
}

/**
 * Clear all lineage graphs for a wallet address
 * 
 * @param walletAddress - Wallet address of the user
 */
export function clearAllLineageGraphs(walletAddress: string): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const prefix = getStorageKey(walletAddress, '');
  const prefixLength = prefix.length;
  
  try {
    // Iterate through all localStorage keys and remove matching ones
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix.substring(0, prefixLength - 1))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (err) {
    console.error('Failed to clear all lineage graphs', err);
  }
}

