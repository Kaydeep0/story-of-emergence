/**
 * Store Structural Neighborhood Index
 * 
 * Stores encrypted neighborhood index in client-side storage.
 * Index is encrypted before storage, server never sees neighborhood data.
 */

import type { EncryptedNeighborhoodIndex } from './encryptNeighborhoodIndex';

const STORAGE_KEY_PREFIX = 'soe_neighborhood_';

/**
 * Get storage key for neighborhood index
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Storage key
 */
function getStorageKey(walletAddress: string, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}_${sessionId}`;
}

/**
 * Save encrypted neighborhood index to localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @param encryptedIndex - Encrypted neighborhood index
 */
export function saveNeighborhoodIndex(
  walletAddress: string,
  sessionId: string,
  encryptedIndex: EncryptedNeighborhoodIndex
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(encryptedIndex));
  } catch (err) {
    console.error('Failed to save neighborhood index', err);
  }
}

/**
 * Load encrypted neighborhood index from localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Encrypted neighborhood index or null if not found
 */
export function loadNeighborhoodIndex(
  walletAddress: string,
  sessionId: string
): EncryptedNeighborhoodIndex | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored) as EncryptedNeighborhoodIndex;
  } catch (err) {
    console.error('Failed to load neighborhood index', err);
    return null;
  }
}

/**
 * Clear neighborhood index for a session
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 */
export function clearNeighborhoodIndex(
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
    console.error('Failed to clear neighborhood index', err);
  }
}

/**
 * Clear all neighborhood indices for a wallet address
 * 
 * @param walletAddress - Wallet address of the user
 */
export function clearAllNeighborhoodIndices(walletAddress: string): void {
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
    console.error('Failed to clear all neighborhood indices', err);
  }
}

