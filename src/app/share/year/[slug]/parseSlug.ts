// src/app/share/year/[slug]/parseSlug.ts
// Pure helper to parse and validate slug as PublicSharePayload
// Defensive: try/catch, size cap, schema validation

import type { PublicSharePayload } from '../../../lib/share/publicSharePayload';

/**
 * Maximum allowed payload size after decode (20 KB)
 */
const MAX_PAYLOAD_SIZE = 20 * 1024; // 20 KB

/**
 * Parse base64url encoded slug to PublicSharePayload
 * 
 * Defensive parsing:
 * - Try/catch for decode errors
 * - Size cap (20 KB after decode)
 * - Schema validation
 * 
 * @param slug - Base64url encoded JSON string
 * @returns PublicSharePayload if valid, null if invalid
 */
export function parseSlug(slug: string): PublicSharePayload | null {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  try {
    // Decode base64url to base64
    // Base64url uses - and _ instead of + and /, and no padding
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }

    // Decode base64
    const decoded = atob(base64);
    
    // Size check: reject if over 20 KB
    if (decoded.length > MAX_PAYLOAD_SIZE) {
      console.error('Payload exceeds size limit:', decoded.length);
      return null;
    }

    // Parse JSON
    const parsed = JSON.parse(decoded);

    // Schema validation: must be PublicSharePayload
    if (!isValidPublicSharePayload(parsed)) {
      console.error('Invalid payload schema');
      return null;
    }

    return parsed as PublicSharePayload;
  } catch (error) {
    console.error('Failed to parse slug:', error);
    return null;
  }
}

/**
 * Validate that an object matches PublicSharePayload schema
 * 
 * @param obj - Object to validate
 * @returns true if valid PublicSharePayload, false otherwise
 */
function isValidPublicSharePayload(obj: unknown): obj is PublicSharePayload {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const payload = obj as Record<string, unknown>;

  // Check required fields
  if (!payload.capsule || typeof payload.capsule !== 'object') {
    return false;
  }

  if (typeof payload.shareFormat !== 'string' || 
      !['text', 'image', 'link'].includes(payload.shareFormat)) {
    return false;
  }

  if (typeof payload.contextHint !== 'string' || 
      !['observational', 'reflective'].includes(payload.contextHint)) {
    return false;
  }

  if (typeof payload.origin !== 'string' || 
      !['yearly', 'weekly', 'moment'].includes(payload.origin)) {
    return false;
  }

  // Validate capsule structure
  const capsule = payload.capsule as Record<string, unknown>;
  
  if (typeof capsule.insightSentence !== 'string') {
    return false;
  }

  if (typeof capsule.temporalContext !== 'string' || 
      !['recent', 'over time', 'recurring', 'emerging', 'persistent'].includes(capsule.temporalContext as string)) {
    return false;
  }

  if (!capsule.philosophicalFrame || typeof capsule.philosophicalFrame !== 'object') {
    return false;
  }

  const frame = capsule.philosophicalFrame as Record<string, unknown>;
  
  if (typeof frame.regime !== 'string' || 
      !['deterministic', 'structured', 'emergent', 'chaotic'].includes(frame.regime as string)) {
    return false;
  }

  if (typeof frame.position !== 'number' || 
      frame.position < 0 || frame.position > 1) {
    return false;
  }

  return true;
}

