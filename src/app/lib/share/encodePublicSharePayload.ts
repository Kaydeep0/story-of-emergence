// src/app/lib/share/encodePublicSharePayload.ts
// Encode PublicSharePayload to base64url string for URL sharing
// No metadata, no timestamps, no IDs added

import type { PublicSharePayload } from './publicSharePayload';

/**
 * Maximum allowed payload size before encoding (20 KB)
 * Matches the constraint in parseSlug.ts
 */
const MAX_PAYLOAD_SIZE = 20 * 1024; // 20 KB

/**
 * Encode PublicSharePayload to base64url string
 * 
 * Process:
 * 1. JSON.stringify payload
 * 2. Convert to UTF-8 bytes
 * 3. Encode as base64
 * 4. Convert to base64url (replace + with -, / with _, remove padding)
 * 
 * Rules:
 * - Do not alter payload contents
 * - No metadata added
 * - No timestamps added
 * - No IDs added
 * - Enforce max encoded length (20 KB constraint)
 * 
 * @param payload - PublicSharePayload to encode
 * @returns base64url encoded string, or null if payload exceeds size limit
 */
export function encodePublicSharePayload(payload: PublicSharePayload): string | null {
  try {
    // Stringify payload to JSON
    const jsonString = JSON.stringify(payload);
    
    // Check size before encoding (UTF-8 encoding may increase size slightly, but JSON.stringify is a good proxy)
    if (jsonString.length > MAX_PAYLOAD_SIZE) {
      console.error('Payload exceeds size limit:', jsonString.length);
      return null;
    }

    // Convert string to base64
    // In browser, btoa handles UTF-8 encoding
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    
    // Convert base64 to base64url:
    // - Replace + with -
    // - Replace / with _
    // - Remove padding (=)
    const base64url = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return base64url;
  } catch (error) {
    console.error('Failed to encode payload:', error);
    return null;
  }
}

/**
 * Build public share URL from PublicSharePayload
 * 
 * @param payload - PublicSharePayload to encode
 * @returns Full URL string, or null if encoding fails
 */
export function buildPublicShareUrl(payload: PublicSharePayload): string | null {
  const encoded = encodePublicSharePayload(payload);
  if (!encoded) {
    return null;
  }

  // Build absolute URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/share/year/${encoded}`;
}

