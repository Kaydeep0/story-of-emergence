// src/app/lib/insights/pickEvidenceChips.ts
// Observer v0: Evidence Chips
// Simple keyword-based excerpt picker that makes insights feel like they're actually reading

import type { ReflectionEntry } from './types';

/**
 * Evidence chip with excerpt from a reflection
 */
export type EvidenceChip = {
  reflectionId: string;
  createdAtIso: string;
  excerpt: string; // 90-140 character excerpt
};

/**
 * Simple stopwords to filter out
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'including', 'against', 'among',
  'throughout', 'despite', 'towards', 'upon', 'concerning', 'to', 'of', 'in', 'for',
  'on', 'at', 'by', 'with', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now',
]);

/**
 * Tokenize text into keywords (lowercase, remove stopwords)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Extract best sentence from text based on keyword density
 */
function extractBestSentence(text: string, keywords: string[]): string {
  // Split into sentences (simple approach: split on period, exclamation, question mark)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter very short sentences

  if (sentences.length === 0) {
    // Fallback: return first 140 chars
    return text.slice(0, 140).trim() + (text.length > 140 ? '...' : '');
  }

  // Score each sentence by keyword overlap
  let bestSentence = sentences[0];
  let bestScore = 0;

  for (const sentence of sentences) {
    const sentenceTokens = tokenize(sentence);
    const overlap = keywords.filter(kw => sentenceTokens.includes(kw)).length;
    const score = overlap / Math.max(1, sentenceTokens.length); // Density score

    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  // Trim to 90-140 characters
  if (bestSentence.length > 140) {
    // Try to cut at word boundary
    const trimmed = bestSentence.slice(0, 137);
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > 90) {
      return trimmed.slice(0, lastSpace) + '...';
    }
    return trimmed + '...';
  }

  if (bestSentence.length < 90 && sentences.length > 1) {
    // Try to include next sentence if first is too short
    const nextIdx = sentences.indexOf(bestSentence) + 1;
    if (nextIdx < sentences.length) {
      const combined = bestSentence + ' ' + sentences[nextIdx];
      if (combined.length <= 140) {
        return combined;
      }
    }
  }

  return bestSentence;
}

/**
 * Pick 1-3 evidence chips from reflections based on card claim
 * 
 * @param reflections - Decrypted reflection entries to search
 * @param claim - The card's claim text (used for keyword matching)
 * @param context - Optional context to boost certain reflections (e.g., spike date, pattern days)
 * @returns Array of 1-3 evidence chips, or empty array if no good matches
 */
export function pickEvidenceChips(
  reflections: ReflectionEntry[],
  claim: string,
  context?: {
    spikeDate?: string; // YYYY-MM-DD format
    patternDays?: string[]; // Day names like ['Monday', 'Wednesday']
  }
): EvidenceChip[] {
  if (reflections.length === 0) {
    return [];
  }

  // Tokenize claim to get keywords
  const keywords = tokenize(claim);

  if (keywords.length === 0) {
    return []; // No meaningful keywords, skip
  }

  // Score each reflection
  const scored: Array<{ reflection: ReflectionEntry; score: number }> = [];

  for (const reflection of reflections) {
    const text = reflection.plaintext || '';
    if (text.length < 20) {
      continue; // Skip very short reflections
    }

    const textTokens = tokenize(text);
    const overlap = keywords.filter(kw => textTokens.includes(kw)).length;
    
    // Base score: keyword overlap normalized by text length
    let score = overlap / Math.max(1, textTokens.length);

    // Bonus: if reflection is on spike day
    if (context?.spikeDate) {
      const reflectionDate = new Date(reflection.createdAt).toISOString().split('T')[0];
      if (reflectionDate === context.spikeDate) {
        score += 0.5; // Significant bonus for spike day
      }
    }

    // Bonus: if reflection is on a pattern day
    if (context?.patternDays && context.patternDays.length > 0) {
      const reflectionDate = new Date(reflection.createdAt);
      const dayName = reflectionDate.toLocaleDateString('en-US', { weekday: 'long' });
      if (context.patternDays.includes(dayName)) {
        score += 0.3; // Bonus for pattern day
      }
    }

    // Only include if there's some overlap
    if (overlap > 0 || score > 0.3) {
      scored.push({ reflection, score });
    }
  }

  if (scored.length === 0) {
    return []; // No matches, return empty
  }

  // Sort by score (highest first) and take top 2-3
  scored.sort((a, b) => b.score - a.score);
  const topReflections = scored.slice(0, 3);

  // Extract excerpts
  const chips: EvidenceChip[] = [];

  for (const { reflection } of topReflections) {
    const excerpt = extractBestSentence(reflection.plaintext || '', keywords);
    
    if (excerpt.length >= 20) {
      chips.push({
        reflectionId: reflection.id,
        createdAtIso: reflection.createdAt,
        excerpt,
      });
    }
  }

  // Return 1-3 chips (only if we have good matches)
  return chips.slice(0, 3);
}

