/**
 * Store Emergence Presence Marker
 * 
 * Stores encrypted emergence presence marker in client-side storage.
 * Marker is encrypted before storage, server never sees presence state.
 */

import type { EncryptedPresenceMarker } from './encryptPresenceMarker';

const STORAGE_KEY_PREFIX = 'soe_presence_';

/**
 * Get storage key for presence marker
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Storage key
 */
function getStorageKey(walletAddress: string, sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}_${sessionId}`;
}

/**
 * Save encrypted presence marker to localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @param encryptedMarker - Encrypted presence marker
 */
export function savePresenceMarker(
  walletAddress: string,
  sessionId: string,
  encryptedMarker: EncryptedPresenceMarker
): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no-op
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(encryptedMarker));
  } catch (err) {
    console.error('Failed to save presence marker', err);
  }
}

/**
 * Load encrypted presence marker from localStorage
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 * @returns Encrypted presence marker or null if not found
 */
export function loadPresenceMarker(
  walletAddress: string,
  sessionId: string
): EncryptedPresenceMarker | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }

  const storageKey = getStorageKey(walletAddress, sessionId);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }
    
    return JSON.parse(stored) as EncryptedPresenceMarker;
  } catch (err) {
    console.error('Failed to load presence marker', err);
    return null;
  }
}

/**
 * Clear presence marker for a session
 * 
 * @param walletAddress - Wallet address of the user
 * @param sessionId - Session identifier
 */
export function clearPresenceMarker(
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
    console.error('Failed to clear presence marker', err);
  }
}

/**
 * Clear all presence markers for a wallet address
 * 
 * @param walletAddress - Wallet address of the user
 */
export function clearAllPresenceMarkers(walletAddress: string): void {
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
    console.error('Failed to clear all presence markers', err);
  }
}

