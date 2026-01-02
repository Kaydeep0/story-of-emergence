// src/app/lib/share/buildSharePackCaption.ts
// Build caption text from canonical SharePack
// Phase 3.3: UI-only caption generation from frozen SharePack contract

import type { SharePack } from './sharePack';
import { sanitizeCaption } from './sanitizeShareMetadata';

export type Platform = 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'threads';

/**
 * Build platform-specific caption from SharePack
 * 
 * Pure function - no side effects, deterministic output.
 * Only uses data from SharePack contract.
 * 
 * @param pack - The SharePack to build caption from
 * @param platform - Target platform for caption style
 * @returns Caption text string
 */
export function buildSharePackCaption(pack: SharePack, platform: Platform): string {
  const parts: string[] = [];

  // Platform-specific caption styles
  if (platform === 'instagram') {
    // Instagram: poetic, not analytical
    if (pack.oneSentenceSummary) {
      parts.push(pack.oneSentenceSummary);
    }
    if (pack.archetype) {
      parts.push(''); // Blank line
      parts.push(pack.archetype);
    }
    if (pack.keyNumbers) {
      parts.push(`${pack.keyNumbers.frequency} reflections across ${pack.year}.`);
    }
    parts.push('Derived from encrypted private journal.');
  } else if (platform === 'linkedin') {
    // LinkedIn: professional but warm
    if (pack.oneSentenceSummary) {
      parts.push(pack.oneSentenceSummary);
    }
    if (pack.archetype) {
      parts.push(''); // Blank line
      parts.push(`Archetype: ${pack.archetype}`);
    }
    if (pack.keyNumbers) {
      parts.push(`${pack.keyNumbers.frequency} entries across ${pack.keyNumbers.spikeCount} spike days.`);
    }
    parts.push('Computed locally. No cloud AI.');
  } else if (platform === 'x') {
    // X/Twitter: concise
    if (pack.oneSentenceSummary) {
      parts.push(pack.oneSentenceSummary);
    }
    if (pack.archetype) {
      parts.push(''); // Blank line
      parts.push(pack.archetype);
    }
    parts.push('Derived from encrypted private journal.');
  } else if (platform === 'threads') {
    // Threads: similar to Instagram
    if (pack.oneSentenceSummary) {
      parts.push(pack.oneSentenceSummary);
    }
    if (pack.archetype) {
      parts.push(''); // Blank line
      parts.push(pack.archetype);
    }
    parts.push('Derived from encrypted private journal.');
  } else {
    // TikTok: same as Instagram for caption
    if (pack.oneSentenceSummary) {
      parts.push(pack.oneSentenceSummary);
    }
    if (pack.archetype) {
      parts.push(''); // Blank line
      parts.push(pack.archetype);
    }
    parts.push('Derived from encrypted private journal.');
  }

  let caption = parts.join('\n');

  // Sanitize caption to remove sensitive metadata
  caption = sanitizeCaption(caption);

  return caption;
}

