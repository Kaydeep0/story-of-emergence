/**
 * Store Structural Density Map
 * 
 * Stores encrypted density map in client-side storage.
 * Map is encrypted before storage, server never sees density data.
 */

import type { EncryptedDensityMap } from './encryptDensityMap';

const STORAGE_KEY_PREFIX = 'soe_density_';

/**
 * Get storage key for density map
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Storage key
 */
function getStorageKey(walletAddress: string, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}_${sessionId}`;
}

/**
 * Save encrypted density map to localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @param encryptedMap - Encrypted density map
 */
export function saveDensityMap(
  walletAddress: string,
  sessionId: string,
  encryptedMap: EncryptedDensityMap
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(encryptedMap));
  } catch (err) {
    console.error('Failed to save density map', err);
  }
}

/**
 * Load encrypted density map from localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Encrypted density map or null if not found
 */
export function loadDensityMap(
  walletAddress: string,
  sessionId: string
): EncryptedDensityMap | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored) as EncryptedDensityMap;
  } catch (err) {
    console.error('Failed to load density map', err);
    return null;
  }
}

/**
 * Clear density map for a session
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 */
export function clearDensityMap(
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
    console.error('Failed to clear density map', err);
  }
}

/**
 * Clear all density maps for a wallet address
 * 
 * @param walletAddress - Wallet address of the user
 */
export function clearAllDensityMaps(walletAddress: string): void {
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
    console.error('Failed to clear all density maps', err);
  }
}

