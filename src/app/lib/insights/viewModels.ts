import type { DistributionNarrative } from '@/app/lib/distributions/narratives';
import type { NarrativeDelta } from '@/app/lib/distributions/deltas';
import { generateInsightLabel } from './labels';

export type InsightCard = {
  id: string;
  scope: 'week' | 'month' | 'year';
  headline: string;
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  label?: string; // Optional density and cadence label
};

export type InsightDeltaCard = {
  id: string;
  scope: 'week' | 'month' | 'year';
  direction: 'intensifying' | 'stabilizing' | 'fragmenting' | 'no_change';
  headline: string;
  summary: string;
};

/**
 * Convert DistributionNarrative to InsightCard view model
 * Pure function, field mapping only - no logic changes, no inference, no recomputation
 * @param narrative Distribution narrative to convert
 * @param label Optional density and cadence label
 * @returns InsightCard view model
 */
export function fromNarrative(
  narrative: DistributionNarrative,
  label?: string
): InsightCard {
  return {
    id: generateStableId(narrative.scope, narrative.headline),
    scope: narrative.scope,
    headline: narrative.headline,
    summary: narrative.summary,
    confidence: narrative.confidence,
    label,
  };
}

/**
 * Convert NarrativeDelta to InsightDeltaCard view model
 * Pure function, field mapping only - no logic changes, no inference, no recomputation
 * @param delta Narrative delta to convert
 * @returns InsightDeltaCard view model
 */
export function fromDelta(delta: NarrativeDelta): InsightDeltaCard {
  return {
    id: generateStableId(delta.scope, delta.headline),
    scope: delta.scope,
    direction: delta.direction,
    headline: delta.headline,
    summary: delta.summary,
  };
}

/**
 * Generate stable ID from scope and headline
 * Deterministic hash function
 * @param scope Time scope
 * @param headline Headline text
 * @returns Stable ID string
 */
function generateStableId(scope: string, headline: string): string {
  // Simple deterministic hash: scope + normalized headline
  const normalized = headline.toLowerCase().trim().replace(/\s+/g, '-');
  const hash = simpleHash(`${scope}:${normalized}`);
  return `${scope}-${hash}`;
}

/**
 * Simple deterministic hash function
 * @param str String to hash
 * @returns Hash value as string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16).substring(0, 8);
}

