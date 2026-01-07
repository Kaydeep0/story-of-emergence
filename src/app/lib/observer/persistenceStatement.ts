// src/app/lib/observer/persistenceStatement.ts
// Observer v1: Persistence statement generation
// Pure function with strict types and no side effects

import type { PatternPersistenceResult } from './patternPersistence';

/**
 * Format lens name for display
 * 
 * Converts internal lens names to display names.
 */
function formatLensName(lens: string): string {
  const lensMap: Record<string, string> = {
    'weekly': 'Weekly',
    'yearly': 'Yearly',
    'monthly': 'Monthly',
    'summary': 'Summary',
    'timeline': 'Timeline',
    'lifetime': 'Lifetime',
    'yoy': 'Year over Year',
    'distributions': 'Distributions',
  };
  
  return lensMap[lens.toLowerCase()] || lens;
}

/**
 * Generate persistence statement from recognition result
 * 
 * Applies Observer Speech Constraint from docs/OBSERVER_SPEECH.md:
 * - One sentence maximum
 * - One clause maximum
 * - Present tense for structural recognition
 * - References windows/lenses only
 * - No interpretation, value judgment, or prediction
 * 
 * @param result - Pattern persistence recognition result
 * @returns Single sentence string or null if invalid
 */
export function toPersistenceStatement(
  result: PatternPersistenceResult | null
): string | null {
  // Return null if no result
  if (!result) {
    return null;
  }
  
  // Require exactly two lenses
  if (!result.lenses || result.lenses.length !== 2) {
    return null;
  }
  
  // Format lens names
  const lensA = formatLensName(result.lenses[0]);
  const lensB = formatLensName(result.lenses[1]);
  
  // Generate statement: "This pattern appears in [LensA] and [LensB]."
  // Uses present tense, references windows only, one sentence, one clause
  return `This pattern appears in ${lensA} and ${lensB}.`;
}

