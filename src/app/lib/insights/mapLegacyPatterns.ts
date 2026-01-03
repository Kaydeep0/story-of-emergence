// src/app/lib/insights/mapLegacyPatterns.ts
// Bridge from legacy pattern labels to canonical InsightPatternSet
// Phase 4.1: Type-only mapping, no compute changes

import type { InsightPatternSet, InsightPattern, InsightEvidenceChip } from './patternModel';
import { makePatternId } from './patternModel';

/**
 * Map legacy pattern labels (e.g., topGuessedTopics from Weekly) to canonical InsightPatternSet
 * 
 * @param labels - Array of pattern labels (e.g., ["work", "health", "learning"])
 * @param windowStartISO - Optional window start ISO string
 * @param windowEndISO - Optional window end ISO string
 * @returns InsightPatternSet with patterns mapped to "uncategorized" kind
 */
export function mapLegacyPatternLabelsToSet(
  labels: string[],
  windowStartISO?: string,
  windowEndISO?: string
): InsightPatternSet {
  const patterns: InsightPattern[] = labels.map((label, index) => {
    const evidence: InsightEvidenceChip[] = [];
    
    // Create evidence chip if window info available
    if (windowStartISO || windowEndISO) {
      evidence.push({
        id: `evidence-${index}`,
        label,
        windowStartISO,
        windowEndISO,
        source: 'reflections',
      });
    }
    
    return {
      id: makePatternId('uncategorized', label),
      kind: 'uncategorized',
      label,
      evidence: evidence.length > 0 ? evidence : undefined,
    };
  });
  
  return {
    patterns,
    updatedAtISO: new Date().toISOString(),
  };
}

