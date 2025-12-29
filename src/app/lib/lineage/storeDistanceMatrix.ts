/**
 * Store Structural Distance Matrix
 * 
 * Stores encrypted distance matrix in client-side storage.
 * Matrix is encrypted before storage, server never sees distance data.
 */

import type { EncryptedDistanceMatrix } from './encryptDistanceMatrix';

const STORAGE_KEY_PREFIX = 'soe_distance_';

/**
 * Get storage key for distance matrix
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Storage key
 */
function getStorageKey(walletAddress: string, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}_${sessionId}`;
}

/**
 * Save encrypted distance matrix to localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @param encryptedMatrix - Encrypted distance matrix
 */
export function saveDistanceMatrix(
  walletAddress: string,
  sessionId: string,
  encryptedMatrix: EncryptedDistanceMatrix
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(encryptedMatrix));
  } catch (err) {
    console.error('Failed to save distance matrix', err);
  }
}

/**
 * Load encrypted distance matrix from localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Encrypted distance matrix or null if not found
 */
export function loadDistanceMatrix(
  walletAddress: string,
  sessionId: string
): EncryptedDistanceMatrix | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored) as EncryptedDistanceMatrix;
  } catch (err) {
    console.error('Failed to load distance matrix', err);
    return null;
  }
}

/**
 * Clear distance matrix for a session
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 */
export function clearDistanceMatrix(
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
    console.error('Failed to clear distance matrix', err);
  }
}

/**
 * Clear all distance matrices for a wallet address
 * 
 * @param walletAddress - Wallet address of the user
 */
export function clearAllDistanceMatrices(walletAddress: string): void {
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
    console.error('Failed to clear all distance matrices', err);
  }
}

