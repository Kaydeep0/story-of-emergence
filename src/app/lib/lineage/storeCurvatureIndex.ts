/**
 * Store Structural Curvature Index
 * 
 * Stores encrypted curvature index in client-side storage.
 * Index is encrypted before storage, server never sees curvature data.
 */

import type { EncryptedCurvatureIndex } from './encryptCurvatureIndex';

const STORAGE_KEY_PREFIX = 'soe_curvature_';

/**
 * Get storage key for curvature index
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Storage key
 */
function getStorageKey(walletAddress: string, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}_${sessionId}`;
}

/**
 * Save encrypted curvature index to localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @param encryptedIndex - Encrypted curvature index
 */
export function saveCurvatureIndex(
  walletAddress: string,
  sessionId: string,
  encryptedIndex: EncryptedCurvatureIndex
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(encryptedIndex));
  } catch (err) {
    console.error('Failed to save curvature index', err);
  }
}

/**
 * Load encrypted curvature index from localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Encrypted curvature index or null if not found
 */
export function loadCurvatureIndex(
  walletAddress: string,
  sessionId: string
): EncryptedCurvatureIndex | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored) as EncryptedCurvatureIndex;
  } catch (err) {
    console.error('Failed to load curvature index', err);
    return null;
  }
}

/**
 * Clear curvature index for a session
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 */
export function clearCurvatureIndex(
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
    console.error('Failed to clear curvature index', err);
  }
}

/**
 * Clear all curvature indices for a wallet address
 * 
 * @param walletAddress - Wallet address of the user
 */
export function clearAllCurvatureIndices(walletAddress: string): void {
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
    console.error('Failed to clear all curvature indices', err);
  }
}

