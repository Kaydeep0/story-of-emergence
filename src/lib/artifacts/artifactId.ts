/**
 * Artifact ID Generation
 * 
 * Generates deterministic, stable artifact IDs using SHA-256.
 * 
 * Used for deduplication and sharing receipts.
 * Not visible in UI, included only in metadata or console logs.
 */

/**
 * Generate a deterministic artifact ID from artifact metadata.
 * 
 * Uses SHA-256 hash of:
 * - wallet (lowercase)
 * - kind
 * - startDate (firstReflectionDate or null)
 * - endDate (lastReflectionDate or null)
 * 
 * This ensures:
 * - Same inputs → same ID
 * - Different artifacts → different IDs
 * - Stable across regenerations
 */
export async function generateArtifactId(
  wallet: string,
  kind: 'lifetime' | 'weekly' | 'yearly',
  startDate: string | null,
  endDate: string | null
): Promise<string> {
  const input = `${wallet.toLowerCase()}|${kind}|${startDate || ''}|${endDate || ''}`;
  
  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

