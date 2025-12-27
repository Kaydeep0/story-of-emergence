// Platform-specific text generation for yearly wrap sharing

export type Platform = 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'threads';

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

