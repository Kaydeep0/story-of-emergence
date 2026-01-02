// src/app/lib/patternMemory/patternNarratives.ts
// Pattern narrative generation layer
// Phase 5.3: Convert pattern deltas into calm, human-readable narratives

import type { InsightPatternKind } from '../insights/patternModel';
import type { PatternDelta } from './patternDelta';

/**
 * Narrative tone - controls the voice of generated narratives
 */
export type NarrativeTone = 'calm' | 'direct';

/**
 * Pattern narrative - human-readable interpretation of a pattern delta
 * 
 * This converts raw pattern deltas into calm, understandable statements
 * with evidence pointers for context.
 * 
 * Phase 5.3: Pure narrative generation - no UI, no storage, no compute changes.
 */
export type PatternNarrative = {
  /** Stable pattern ID */
  id: string;
  /** Pattern kind classification */
  kind: InsightPatternKind;
  /** Delta type this narrative describes */
  deltaType: PatternDelta['deltaType'];
  /** Short title summarizing the pattern change */
  title: string;
  /** Body text explaining the pattern change */
  body: string;
  /** Evidence array providing context for the narrative */
  evidence: Array<{
    label: string;
    windowType?: 'weekly' | 'monthly' | 'yearly' | 'lifetime';
    occurrenceCount?: number;
    previousStrength?: number;
    currentStrength?: number;
  }>;
};

/**
 * Generate pattern narratives from deltas
 * 
 * Converts PatternDelta objects into calm, human-readable narrative statements
 * with evidence pointers. This is pure narrative generation - no side effects.
 * 
 * Phase 5.3: No UI, no storage, no compute changes - only narrative generation.
 * 
 * @param deltas - Array of pattern deltas to convert to narratives
 * @param opts - Optional configuration
 * @param opts.tone - Narrative tone (default: 'calm')
 * @param opts.maxNarratives - Maximum number of narratives to return (default: 5)
 * @param opts.includeStable - Whether to include stable patterns (default: false)
 * @returns Array of pattern narratives, sorted by priority
 */
export function generatePatternNarratives(
  deltas: PatternDelta[],
  opts?: {
    tone?: NarrativeTone;
    maxNarratives?: number;
    includeStable?: boolean;
  }
): PatternNarrative[] {
  const tone = opts?.tone ?? 'calm';
  const maxNarratives = opts?.maxNarratives ?? 5;
  const includeStable = opts?.includeStable ?? false;
  
  // Filter out stable patterns if not included
  const filteredDeltas = includeStable
    ? deltas
    : deltas.filter(delta => delta.deltaType !== 'stable');
  
  // Sort by priority: emergent → persistent → strengthening → fading → stable
  const priorityOrder: Record<PatternDelta['deltaType'], number> = {
    emergent: 1,
    persistent: 2,
    strengthening: 3,
    fading: 4,
    stable: 5,
  };
  
  const sortedDeltas = [...filteredDeltas].sort((a, b) => {
    return priorityOrder[a.deltaType] - priorityOrder[b.deltaType];
  });
  
  // Limit to maxNarratives
  const limitedDeltas = sortedDeltas.slice(0, maxNarratives);
  
  // Generate narratives
  const narratives: PatternNarrative[] = limitedDeltas.map(delta => {
    const { title, body } = generateNarrativeText(delta, tone);
    
    // Build evidence array
    const evidence: PatternNarrative['evidence'] = [];
    
    // Always include occurrence count
    evidence.push({
      label: `Appeared ${delta.occurrenceCount} time${delta.occurrenceCount === 1 ? '' : 's'}`,
      occurrenceCount: delta.occurrenceCount,
    });
    
    // Include strength information when available
    if (delta.previousStrength !== undefined || delta.currentStrength !== undefined) {
      if (delta.deltaType === 'fading' && delta.currentStrength === undefined) {
        // Pattern stopped appearing
        evidence.push({
          label: 'Stopped appearing',
          previousStrength: delta.previousStrength,
        });
      } else if (delta.previousStrength !== undefined && delta.currentStrength !== undefined) {
        // Both strengths available - show change
        const strengthChange = delta.currentStrength - delta.previousStrength;
        const changeLabel = strengthChange > 0
          ? `Strength increased from ${formatStrength(delta.previousStrength)} to ${formatStrength(delta.currentStrength)}`
          : `Strength decreased from ${formatStrength(delta.previousStrength)} to ${formatStrength(delta.currentStrength)}`;
        
        evidence.push({
          label: changeLabel,
          previousStrength: delta.previousStrength,
          currentStrength: delta.currentStrength,
        });
      } else if (delta.currentStrength !== undefined) {
        // Only current strength available
        evidence.push({
          label: `Current strength: ${formatStrength(delta.currentStrength)}`,
          currentStrength: delta.currentStrength,
        });
      } else if (delta.previousStrength !== undefined) {
        // Only previous strength available
        evidence.push({
          label: `Previous strength: ${formatStrength(delta.previousStrength)}`,
          previousStrength: delta.previousStrength,
        });
      }
    }
    
    return {
      id: delta.id,
      kind: delta.kind,
      deltaType: delta.deltaType,
      title,
      body,
      evidence,
    };
  });
  
  return narratives;
}

/**
 * Generate narrative text for a delta
 * 
 * Returns title and body based on delta type and tone.
 * Templates are deterministic and calm.
 */
function generateNarrativeText(
  delta: PatternDelta,
  tone: NarrativeTone
): { title: string; body: string } {
  switch (delta.deltaType) {
    case 'emergent':
      return {
        title: 'A new pattern is forming',
        body: 'This pattern appeared in the latest window and was not present before.',
      };
    
    case 'persistent':
      return {
        title: 'A pattern is repeating',
        body: 'This pattern has shown up across multiple windows, suggesting consistency.',
      };
    
    case 'strengthening':
      return {
        title: 'This pattern is getting stronger',
        body: 'The intensity of this pattern increased compared with the prior window.',
      };
    
    case 'fading':
      return {
        title: 'This pattern is fading',
        body: 'This pattern weakened or stopped appearing compared with the prior window.',
      };
    
    case 'stable':
      return {
        title: 'Pattern is stable',
        body: 'This pattern remains steady with no meaningful change.',
      };
  }
}

/**
 * Format strength value for display
 * Converts 0-1 range to readable percentage
 */
function formatStrength(strength: number): string {
  return `${Math.round(strength * 100)}%`;
}

/*
 * Self-test example (commented out)
 * 
 * Example input and expected output for testing narrative generation:
 * 
 * Input:
 * const testDeltas: PatternDelta[] = [
 *   {
 *     id: 'work:topic=meetings',
 *     kind: 'work',
 *     deltaType: 'emergent',
 *     occurrenceCount: 1,
 *     currentStrength: 0.7,
 *   },
 *   {
 *     id: 'health:topic=exercise',
 *     kind: 'health',
 *     deltaType: 'persistent',
 *     occurrenceCount: 4,
 *     previousStrength: 0.5,
 *     currentStrength: 0.6,
 *   },
 *   {
 *     id: 'learning:topic=reading',
 *     kind: 'learning',
 *     deltaType: 'strengthening',
 *     occurrenceCount: 2,
 *     previousStrength: 0.3,
 *     currentStrength: 0.7,
 *   },
 * ];
 * 
 * Expected output (first 3 narratives):
 * [
 *   {
 *     id: 'work:topic=meetings',
 *     kind: 'work',
 *     deltaType: 'emergent',
 *     title: 'A new pattern is forming',
 *     body: 'This pattern appeared in the latest window and was not present before.',
 *     evidence: [
 *       { label: 'Appeared 1 time', occurrenceCount: 1 },
 *       { label: 'Current strength: 70%', currentStrength: 0.7 },
 *     ],
 *   },
 *   {
 *     id: 'health:topic=exercise',
 *     kind: 'health',
 *     deltaType: 'persistent',
 *     title: 'A pattern is repeating',
 *     body: 'This pattern has shown up across multiple windows, suggesting consistency.',
 *     evidence: [
 *       { label: 'Appeared 4 times', occurrenceCount: 4 },
 *       { label: 'Strength increased from 50% to 60%', previousStrength: 0.5, currentStrength: 0.6 },
 *     ],
 *   },
 *   {
 *     id: 'learning:topic=reading',
 *     kind: 'learning',
 *     deltaType: 'strengthening',
 *     title: 'This pattern is getting stronger',
 *     body: 'The intensity of this pattern increased compared with the prior window.',
 *     evidence: [
 *       { label: 'Appeared 2 times', occurrenceCount: 2 },
 *       { label: 'Strength increased from 30% to 70%', previousStrength: 0.3, currentStrength: 0.7 },
 *     ],
 *   },
 * ]
 */

