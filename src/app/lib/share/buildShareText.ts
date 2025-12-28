// Platform-specific text generation for yearly wrap sharing

import type { ReflectionEntry } from '../insights/types';

export type Platform = 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'threads';

/**
 * Check if text is probably system or error text that should not be shared
 */
export function isProbablySystemOrErrorText(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Reject if contains system/error keywords
  const systemKeywords = [
    'unable to decrypt', 'decrypt', 'cipher', 'envelope', 'hkdf', 'aes', 'iv',
    'supabase', 'rpc', 'wallet', 'wagmi', 'viem',
    'entryid', 'sourceid', 'uuid', 'json',
    'error', 'failed', 'exception', 'stack', 'undefined', 'null'
  ];
  
  if (systemKeywords.some(keyword => lowerText.includes(keyword))) {
    return true;
  }
  
  // Reject if contains code-like syntax
  const codePatterns = ['=>', 'function', 'const', 'let', 'import', 'export'];
  if (codePatterns.some(pattern => text.includes(pattern))) {
    return true;
  }
  
  // Reject if contains JSON-like structures
  if (text.includes('{') || text.includes('}') || text.includes('[') || text.includes(']')) {
    return true;
  }
  
  // Reject if contains long unbroken tokens (like hashes) over 24 chars
  const words = text.split(/\s+/);
  if (words.some(word => word.length > 24 && /^[a-zA-Z0-9]+$/.test(word))) {
    return true;
  }
  
  return false;
}

/**
 * Clean text for sharing: trim, collapse whitespace, strip weird punctuation, cap length
 */
export function cleanForShare(text: string): string {
  if (!text) return '';
  
  // Trim and collapse whitespace
  let cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Strip leading quote marks and weird punctuation
  cleaned = cleaned.replace(/^["'`«»„‚]+/g, '').replace(/["'`«»„‚]+$/g, '');
  cleaned = cleaned.replace(/^[.,;:!?]+/g, '').trim();
  
  // Hard cap length (220 chars) with ellipsis
  if (cleaned.length > 220) {
    cleaned = cleaned.slice(0, 217) + '...';
  }
  
  // If after cleaning it is < 30 chars, treat as unusable
  if (cleaned.length < 30) {
    return '';
  }
  
  return cleaned;
}

/**
 * Pick top moments for sharing with cleaning and filtering
 */
export function pickTopMomentsForShare(
  entries: ReflectionEntry[],
  topDates: string[],
  n: number = 3
): Array<{ date: string; preview: string; entryId: string }> {
  const moments: Array<{ date: string; preview: string; entryId: string }> = [];
  const seenPreviews = new Set<string>();
  
  for (const date of topDates.slice(0, n)) {
    const dateStr = date; // YYYY-MM-DD format
    const dayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
      return entryDate === dateStr;
    });
    
    if (dayEntries.length > 0) {
      const firstEntry = dayEntries[0];
      if (firstEntry.plaintext) {
        const cleaned = cleanForShare(firstEntry.plaintext);
        
        // Skip if cleaned is empty, is system/error text, or duplicate
        if (
          cleaned &&
          !isProbablySystemOrErrorText(cleaned) &&
          !seenPreviews.has(cleaned.toLowerCase())
        ) {
          moments.push({
            date: dateStr,
            preview: cleaned,
            entryId: firstEntry.id,
          });
          seenPreviews.add(cleaned.toLowerCase());
        }
      }
    }
    
    if (moments.length >= n) break;
  }
  
  // If fewer than 2 exist, return empty array (let UI show fallback)
  return moments.length >= 2 ? moments : [];
}

export interface ShareContent {
  identitySentence?: string;
  archetype?: string;
  hasYearShape?: boolean;
  hasMoments?: boolean;
  numbers?: {
    totalEntries: number;
    activeDays: number;
    spikeRatio: number;
  };
  mirrorInsight?: string;
}

export interface ShareTexts {
  caption: string;
  tiktokOverlay?: string[];
}

export function buildShareText(
  platform: Platform,
  content: ShareContent
): ShareTexts {
  const parts: string[] = [];

  // Platform-specific caption styles (no analytics tone)
  // One blank line between sentence and archetype
  if (platform === 'instagram') {
    // Instagram: poetic, not analytical
    if (content.identitySentence) {
      parts.push(content.identitySentence);
    }
    if (content.archetype) {
      parts.push(''); // Blank line
      parts.push(content.archetype);
    }
    parts.push('Computed locally with Story of Emergence.');
  } else if (platform === 'linkedin') {
    // LinkedIn: professional but warm
    if (content.identitySentence) {
      parts.push(content.identitySentence);
    }
    if (content.archetype) {
      parts.push(''); // Blank line
      parts.push(`Archetype: ${content.archetype}`);
    }
    if (content.numbers) {
      parts.push(`${content.numbers.totalEntries} entries across ${content.numbers.activeDays} active days.`);
    }
    parts.push('Computed locally. No cloud AI.');
  } else if (platform === 'x') {
    // X/Twitter: concise
    if (content.identitySentence) {
      parts.push(content.identitySentence);
    }
    if (content.archetype) {
      parts.push(''); // Blank line
      parts.push(content.archetype);
    }
    parts.push('Computed locally with Story of Emergence.');
  } else if (platform === 'threads') {
    // Threads: similar to Instagram
    if (content.identitySentence) {
      parts.push(content.identitySentence);
    }
    if (content.archetype) {
      parts.push(''); // Blank line
      parts.push(content.archetype);
    }
    parts.push('Computed locally with Story of Emergence.');
  } else {
    // TikTok: same as Instagram for caption
    if (content.identitySentence) {
      parts.push(content.identitySentence);
    }
    if (content.archetype) {
      parts.push(''); // Blank line
      parts.push(content.archetype);
    }
    parts.push('Computed locally with Story of Emergence.');
  }

  const caption = parts.join('\n');

  // TikTok overlay (3 lines max, punchy)
  let tiktokOverlay: string[] | undefined;
  if (platform === 'tiktok') {
    tiktokOverlay = [];
    if (content.identitySentence) {
      tiktokOverlay.push(content.identitySentence);
    }
    if (content.archetype) {
      tiktokOverlay.push(content.archetype);
    }
    if (content.numbers) {
      tiktokOverlay.push('Quiet days. Big moments.');
    }
    // Limit to 3 lines
    tiktokOverlay = tiktokOverlay.slice(0, 3);
  }

  return {
    caption,
    tiktokOverlay,
  };
}

