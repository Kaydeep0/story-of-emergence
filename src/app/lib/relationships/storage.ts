// src/app/lib/relationships/storage.ts
// Save and load functions for relationship storage
// These functions accept and return ciphertext only (no decryption)

import type { EncryptedRelationshipPayload } from './types';

/**
 * Get storage key for a relationship by reflection ID
 */
function getStorageKey(walletAddress: string, reflectionId: string): string {
  return `relationships_${walletAddress.toLowerCase()}_reflection_${reflectionId}`;
}

/**
 * Save an encrypted relationship payload for a reflection
 * This function accepts ciphertext only and stores it without decrypting
 * @param walletAddress - Wallet address of the user
 * @param payload - Encrypted relationship payload
 * @param reflectionId - Optional reflection ID to associate with this relationship
 * @returns Promise resolving to the saved relationship ID
 */
export async function saveRelationshipPayload(
  walletAddress: string,
  payload: EncryptedRelationshipPayload,
  reflectionId?: string
): Promise<{ id: string }> {
  if (typeof window === 'undefined') {
    // Server-side: return placeholder ID
    return {
      id: `relationship_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  // If reflectionId is provided, use it; otherwise generate a new ID
  const relationshipId = reflectionId
    ? `reflection_${reflectionId}`
    : `relationship_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const storageKey = getStorageKey(walletAddress, reflectionId || relationshipId);

  try {
    // Store ciphertext only (no decryption)
    localStorage.setItem(storageKey, JSON.stringify(payload));
    return { id: relationshipId };
  } catch (err) {
    console.error('Failed to save relationship payload', err);
    // Fallback: return placeholder ID
    return {
      id: `relationship_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }
}

/**
 * Load an encrypted relationship payload by reflection ID
 * This function returns ciphertext only without decrypting
 * @param walletAddress - Wallet address of the user
 * @param relationshipId - ID of the relationship to load (can be reflection ID or relationship ID)
 * @returns Promise resolving to the encrypted relationship payload
 */
export async function loadRelationshipPayload(
  walletAddress: string,
  relationshipId: string
): Promise<EncryptedRelationshipPayload | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  // Try both reflection ID format and direct relationship ID format
  const reflectionId = relationshipId.startsWith('reflection_')
    ? relationshipId.replace('reflection_', '')
    : relationshipId;

  const storageKey = getStorageKey(walletAddress, reflectionId);

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const payload = JSON.parse(stored) as EncryptedRelationshipPayload;
    return payload;
  } catch (err) {
    console.error('Failed to load relationship payload', err);
    return null;
  }
}

/**
 * List all relationship payload IDs for a wallet
 * This is a stub function that returns an empty list
 * @param walletAddress - Wallet address of the user
 * @returns Promise resolving to an array of relationship IDs
 */
export async function listRelationshipIds(
  walletAddress: string
): Promise<string[]> {
  // Stub implementation - returns empty array
  // In a real implementation, this would list all relationship IDs for the wallet
  return [];
}

/**
 * Delete a relationship payload by ID
 * This is a stub function
 * @param walletAddress - Wallet address of the user
 * @param relationshipId - ID of the relationship to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteRelationshipPayload(
  walletAddress: string,
  relationshipId: string
): Promise<void> {
  // Stub implementation - no-op
  // In a real implementation, this would delete the relationship from storage
}

