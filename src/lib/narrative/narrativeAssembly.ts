/**
 * Narrative Assembly Contract
 * 
 * This file defines the immutable rules for how reflection history
 * transforms into narrative candidates.
 * 
 * RULES:
 * 1. Narrative drafts are derived, never stored as source of truth
 * 2. Drafts must be fully regenerable from reflections
 * 3. Each narrative sentence must link to source reflection IDs
 * 4. No reflection text is ever modified
 * 5. Drafts can be deleted without data loss
 */

export type NarrativeSection = 'themes' | 'transitions' | 'anchors';

export type NarrativeCandidate = {
  section: NarrativeSection;
  text: string;
  sourceReflectionIds: string[];
};

export type YearNarrativeDraft = {
  year: number;
  generatedAt: string;
  candidates: NarrativeCandidate[];
};

/**
 * Assemble a year's narrative from reflection history.
 * 
 * This function transforms reflection data into narrative candidates
 * without modifying source data or storing drafts as truth.
 * 
 * @param year - The year to assemble narrative for
 * @param reflections - Array of reflection entries with id, created_at, and text
 * @returns YearNarrativeDraft with candidates linked to source reflections
 */
export function assembleYearNarrative(
  year: number,
  reflections: { id: string; created_at: string; text: string }[]
): YearNarrativeDraft {
  throw new Error('Narrative assembly not implemented yet.');
}

