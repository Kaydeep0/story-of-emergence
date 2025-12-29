/**
 * Store Structural Density Gradient
 * 
 * Stores encrypted density gradient in client-side storage.
 * Gradient is encrypted before storage, server never sees gradient data.
 */

import type { EncryptedDensityGradient } from './encryptDensityGradient';

const STORAGE_KEY_PREFIX = 'soe_gradient_';

/**
 * Get storage key for density gradient
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Storage key
 */
function getStorageKey(walletAddress: string, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}_${sessionId}`;
}

/**
 * Save encrypted density gradient to localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @param encryptedGradient - Encrypted density gradient
 */
export function saveDensityGradient(
  walletAddress: string,
  sessionId: string,
  encryptedGradient: EncryptedDensityGradient
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(encryptedGradient));
  } catch (err) {
    console.error('Failed to save density gradient', err);
  }
}

/**
 * Load encrypted density gradient from localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Encrypted density gradient or null if not found
 */
export function loadDensityGradient(
  walletAddress: string,
  sessionId: string
): EncryptedDensityGradient | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored) as EncryptedDensityGradient;
  } catch (err) {
    console.error('Failed to load density gradient', err);
    return null;
  }
}

/**
 * Clear density gradient for a session
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 */
export function clearDensityGradient(
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
    console.error('Failed to clear density gradient', err);
  }
}

/**
 * Clear all density gradients for a wallet address
 * 
 * @param walletAddress - Wallet address of the user
 */
export function clearAllDensityGradients(walletAddress: string): void {
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
    console.error('Failed to clear all density gradients', err);
  }
}

