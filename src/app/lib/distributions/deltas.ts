import type { DistributionNarrative, TimeScope } from './narratives';

export type NarrativeDelta = {
  scope: TimeScope;
  direction: 'intensifying' | 'stabilizing' | 'fragmenting' | 'no_change';
  headline: string;
  summary: string;
};

/**
 * Compare two narratives and generate a delta describing the change
 * Pure function, deterministic
 * Operates on narrative language, not raw statistics, to avoid overfitting
 * @param prev Previous period narrative
 * @param curr Current period narrative
 * @returns Delta describing the change between narratives
 */
export function compareNarratives(
  prev: DistributionNarrative,
  curr: DistributionNarrative
): NarrativeDelta {
  // Require same scope
  if (prev.scope !== curr.scope) {
    throw new Error(`Cannot compare narratives with different scopes: ${prev.scope} vs ${curr.scope}`);
  }

  const scope = prev.scope;

  // Check for no change: identical headlines or equivalent summaries
  if (prev.headline === curr.headline || areSummariesEquivalent(prev.summary, curr.summary)) {
    return {
      scope,
      direction: 'no_change',
      headline: 'No meaningful change detected across this period',
      summary: `Your engagement pattern remained consistent, showing the same distribution characteristics as before.`,
    };
  }

  // Check for stabilization: same shape + same confidence + similar language
  if (prev.confidence === curr.confidence && hasSimilarLanguage(prev.headline, curr.headline)) {
    return {
      scope,
      direction: 'stabilizing',
      headline: 'Your engagement pattern is holding steady',
      summary: `Your activity distribution has remained consistent, maintaining similar patterns of focus and engagement.`,
    };
  }

  // Check for intensifying: confidence increased OR headline indicates concentration
  if (
    confidenceIncreased(prev.confidence, curr.confidence) ||
    indicatesIntensification(prev.headline, curr.headline)
  ) {
    return {
      scope,
      direction: 'intensifying',
      headline: 'Your focus is becoming more concentrated over time',
      summary: `Your activity is clustering into more focused periods, suggesting deeper engagement in concentrated windows.`,
    };
  }

  // Check for fragmenting: headline shifts from focused → scattered
  if (indicatesFragmentation(prev.headline, curr.headline)) {
    return {
      scope,
      direction: 'fragmenting',
      headline: 'Your attention is spreading across more directions',
      summary: `Your activity is becoming more distributed, spreading across a wider range of time periods rather than concentrating.`,
    };
  }

  // Default: no change if we can't determine direction
  return {
    scope,
    direction: 'no_change',
    headline: 'No meaningful change detected across this period',
    summary: `Your engagement pattern remained consistent, showing the same distribution characteristics as before.`,
  };
}

/**
 * Check if two summaries are equivalent (deterministic, keyword-based)
 */
function areSummariesEquivalent(summary1: string, summary2: string): boolean {
  // Normalize and compare key phrases
  const keyPhrases1 = extractKeyPhrases(summary1);
  const keyPhrases2 = extractKeyPhrases(summary2);
  
  // Consider equivalent if they share most key phrases
  const commonPhrases = keyPhrases1.filter(p => keyPhrases2.includes(p));
  return commonPhrases.length >= Math.min(keyPhrases1.length, keyPhrases2.length) * 0.7;
}

/**
 * Extract key phrases from summary text
 */
function extractKeyPhrases(text: string): string[] {
  const normalized = text.toLowerCase();
  const phrases: string[] = [];
  
  // Look for key distribution-related phrases
  const keywords = [
    'evenly distributed',
    'spread consistently',
    'clustered',
    'concentrated',
    'focused periods',
    'steady engagement',
    'intense bursts',
    'patterns',
    'cycles',
  ];
  
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      phrases.push(keyword);
    }
  }
  
  return phrases;
}

/**
 * Check if language is similar between two headlines
 */
function hasSimilarLanguage(headline1: string, headline2: string): boolean {
  const h1 = headline1.toLowerCase();
  const h2 = headline2.toLowerCase();
  
  // Check for shared key words
  const words1 = h1.split(/\s+/);
  const words2 = h2.split(/\s+/);
  
  const commonWords = words1.filter(w => w.length > 4 && words2.includes(w));
  return commonWords.length >= 2;
}

/**
 * Check if confidence increased
 */
function confidenceIncreased(prev: 'low' | 'medium' | 'high', curr: 'low' | 'medium' | 'high'): boolean {
  const levels = { low: 0, medium: 1, high: 2 };
  return levels[curr] > levels[prev];
}

/**
 * Check if headlines indicate intensification (concentration increase)
 */
function indicatesIntensification(prevHeadline: string, currHeadline: string): boolean {
  const prev = prevHeadline.toLowerCase();
  const curr = currHeadline.toLowerCase();
  
  // Intensification keywords
  const intensifyingKeywords = ['concentrated', 'intense', 'focused', 'clustered', 'bursts'];
  const scatteredKeywords = ['evenly', 'spread', 'consistent', 'steady', 'distributed'];
  
  const prevHasIntensifying = intensifyingKeywords.some(k => prev.includes(k));
  const currHasIntensifying = intensifyingKeywords.some(k => curr.includes(k));
  const prevHasScattered = scatteredKeywords.some(k => prev.includes(k));
  
  // Intensifying: prev was scattered, curr is intensifying
  // OR: prev was less intense, curr is more intense
  return (prevHasScattered && currHasIntensifying) || (!prevHasIntensifying && currHasIntensifying);
}

/**
 * Check if headlines indicate fragmentation (scattering increase)
 */
function indicatesFragmentation(prevHeadline: string, currHeadline: string): boolean {
  const prev = prevHeadline.toLowerCase();
  const curr = currHeadline.toLowerCase();
  
  // Fragmentation keywords
  const intensifyingKeywords = ['concentrated', 'intense', 'focused', 'clustered', 'bursts'];
  const scatteredKeywords = ['evenly', 'spread', 'consistent', 'steady', 'distributed'];
  
  const prevHasIntensifying = intensifyingKeywords.some(k => prev.includes(k));
  const currHasScattered = scatteredKeywords.some(k => curr.includes(k));
  const prevHasScattered = scatteredKeywords.some(k => prev.includes(k));
  
  // Fragmenting: prev was intensifying, curr is scattered
  // OR: prev was more intense, curr is less intense
  return (prevHasIntensifying && currHasScattered) || (prevHasIntensifying && !currHasScattered);
}

