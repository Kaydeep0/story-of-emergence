// src/app/lib/patternMemory/selectNarratives.ts
// Narrative selection and prioritization layer
// Phase 5.5: Select which narratives matter most (signal vs noise)

import type { PatternNarrative } from './patternNarratives';

/**
 * Select and prioritize narratives to surface signal instead of noise
 * 
 * This is a pure ranking and filtering function that determines which
 * narratives are most important to surface. It does not change pattern
 * detection - only selects from already-generated narratives.
 * 
 * Phase 5.5: Pure ranking and filtering - no UI, no storage, no new compute.
 * 
 * @param narratives - Array of pattern narratives to select from
 * @param options - Optional configuration
 * @param options.maxNarratives - Maximum number of narratives to return (default: 3)
 * @param options.includeStable - Whether to include stable narratives (default: false)
 * @returns Selected narratives, ranked by priority
 * 
 * @example
 * // Self-test example:
 * // Input narratives:
 * const narratives: PatternNarrative[] = [
 *   {
 *     id: 'work:topic=meetings',
 *     kind: 'work',
 *     deltaType: 'emergent',
 *     title: 'A new pattern is forming',
 *     body: 'This pattern appeared in the latest window and was not present before.',
 *     evidence: [{ label: 'Appeared 1 time', occurrenceCount: 1, currentStrength: 0.7 }],
 *   },
 *   {
 *     id: 'health:topic=exercise',
 *     kind: 'health',
 *     deltaType: 'strengthening',
 *     title: 'This pattern is getting stronger',
 *     body: 'The intensity of this pattern increased compared with the prior window.',
 *     evidence: [
 *       { label: 'Appeared 2 times', occurrenceCount: 2 },
 *       { label: 'Strength increased from 30% to 70%', previousStrength: 0.3, currentStrength: 0.7 },
 *     ],
 *   },
 *   {
 *     id: 'learning:topic=reading',
 *     kind: 'learning',
 *     deltaType: 'persistent',
 *     title: 'A pattern is repeating',
 *     body: 'This pattern has shown up across multiple windows, suggesting consistency.',
 *     evidence: [{ label: 'Appeared 4 times', occurrenceCount: 4 }],
 *   },
 *   {
 *     id: 'focus:topic=meditation',
 *     kind: 'focus',
 *     deltaType: 'stable',
 *     title: 'Pattern is stable',
 *     body: 'This pattern remains steady with no meaningful change.',
 *     evidence: [{ label: 'Appeared 3 times', occurrenceCount: 3 }],
 *   },
 * ];
 * 
 * // Expected output (maxNarratives: 3, includeStable: false):
 * const selected = selectNarratives(narratives, { maxNarratives: 3, includeStable: false });
 * // Returns: [emergent, strengthening, persistent] (in that order)
 * // Stable is excluded, fading would be last if present
 */
export function selectNarratives(
  narratives: PatternNarrative[],
  options?: {
    maxNarratives?: number;
    includeStable?: boolean;
  }
): PatternNarrative[] {
  const maxNarratives = options?.maxNarratives ?? 3;
  const includeStable = options?.includeStable ?? false;
  
  // Filter out stable narratives unless included
  const filtered = includeStable
    ? narratives
    : narratives.filter(n => n.deltaType !== 'stable');
  
  // If no narratives remain, return empty array
  if (filtered.length === 0) {
    return [];
  }
  
  // Ranking priority (highest first):
  // 1. emergent
  // 2. strengthening
  // 3. persistent
  // 4. stable
  // 5. fading
  const priorityOrder: Record<PatternNarrative['deltaType'], number> = {
    emergent: 1,
    strengthening: 2,
    persistent: 3,
    stable: 4,
    fading: 5,
  };
  
  // Sort by priority, then by strength delta, then by occurrence count
  const sorted = [...filtered].sort((a, b) => {
    // First: compare by delta type priority
    const priorityDiff = priorityOrder[a.deltaType] - priorityOrder[b.deltaType];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Within same category: compare by strength delta
    const aStrengthDelta = getStrengthDelta(a);
    const bStrengthDelta = getStrengthDelta(b);
    if (aStrengthDelta !== bStrengthDelta) {
      return bStrengthDelta - aStrengthDelta; // Higher strength delta wins
    }
    
    // If strength delta is same: compare by occurrence count (higher wins)
    const aOccurrences = a.evidence.find(e => e.occurrenceCount !== undefined)?.occurrenceCount ?? 0;
    const bOccurrences = b.evidence.find(e => e.occurrenceCount !== undefined)?.occurrenceCount ?? 0;
    return bOccurrences - aOccurrences;
  });
  
  // Limit to maxNarratives
  return sorted.slice(0, maxNarratives);
}

/**
 * Calculate strength delta from narrative evidence
 * Returns the difference between current and previous strength
 * Returns 0 if no strength information available
 */
function getStrengthDelta(narrative: PatternNarrative): number {
  const evidence = narrative.evidence;
  
  // Find evidence with both previous and current strength
  const strengthEvidence = evidence.find(
    e => e.previousStrength !== undefined && e.currentStrength !== undefined
  );
  
  if (strengthEvidence && strengthEvidence.previousStrength !== undefined && strengthEvidence.currentStrength !== undefined) {
    return strengthEvidence.currentStrength - strengthEvidence.previousStrength;
  }
  
  // Fallback: use current strength if available
  const currentEvidence = evidence.find(e => e.currentStrength !== undefined);
  if (currentEvidence && currentEvidence.currentStrength !== undefined) {
    return currentEvidence.currentStrength;
  }
  
  // No strength information
  return 0;
}

