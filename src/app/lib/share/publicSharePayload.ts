// src/app/lib/share/publicSharePayload.ts
// Public Share Payload Contract - Platform-agnostic wrapper for Meaning Capsule
// Contract-only: no JSX, no rendering, no UI, no fetching, no inference

import type { MeaningCapsule } from './meaningCapsule';

/**
 * Public Share Payload - Thin wrapper around Meaning Capsule for external sharing
 * 
 * A minimal, platform-agnostic payload that wraps a Meaning Capsule
 * for external sharing (social, link, image, embed) without adding meaning.
 * 
 * This is a structural wrapper only - it does not alter or enrich
 * the meaning content of the capsule.
 * 
 * Designed to be safe for public channels:
 * - No timestamps
 * - No user, wallet, or ID references
 * - No personal data
 * - JSON-serializable
 * - Safe to log or send over public channels
 */
export type PublicSharePayload = {
  /** The meaning capsule being shared (unchanged) */
  capsule: MeaningCapsule;
  
  /** Share format - how this payload should be rendered */
  shareFormat: 'text' | 'image' | 'link';
  
  /** Context hint - how the capsule should be interpreted */
  contextHint: 'observational' | 'reflective';
  
  /** Origin - where this capsule came from */
  origin: 'yearly' | 'weekly' | 'moment';
};

/**
 * Options for building a Public Share Payload
 * These are structural choices only - they do not modify meaning
 */
export type PublicSharePayloadOptions = {
  /** Share format - how this payload should be rendered */
  shareFormat: PublicSharePayload['shareFormat'];
  
  /** Context hint - how the capsule should be interpreted */
  contextHint: PublicSharePayload['contextHint'];
  
  /** Origin - where this capsule came from */
  origin: PublicSharePayload['origin'];
};

/**
 * Build a Public Share Payload from a Meaning Capsule
 * 
 * Pure function - deterministic, no side effects.
 * Wraps the capsule with sharing metadata without altering its content.
 * 
 * Rules:
 * - No transformation of meaning content
 * - No enrichment or inference
 * - No fetching or network calls
 * - Pure structural wrapping only
 * - The capsule is passed through unchanged
 * 
 * @param capsule - The Meaning Capsule to wrap (unchanged)
 * @param options - Structural options for sharing (format, context, origin)
 * @returns PublicSharePayload safe for public sharing
 */
export function buildPublicSharePayload(
  capsule: MeaningCapsule,
  options: PublicSharePayloadOptions
): PublicSharePayload {
  // Pass capsule through unchanged - no modification of meaning content
  return {
    capsule,
    shareFormat: options.shareFormat,
    contextHint: options.contextHint,
    origin: options.origin,
  };
}

