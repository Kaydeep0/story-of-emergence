// src/app/lib/insights/patternModel.ts
// Canonical pattern model for all insights
// Phase 4.1: Types only, no behavior changes

/**
 * Canonical pattern kind classification
 */
export type InsightPatternKind =
  | 'focus'
  | 'relationships'
  | 'money'
  | 'health'
  | 'work'
  | 'learning'
  | 'uncategorized';

/**
 * Evidence chip linking a pattern to specific data points
 */
export type InsightEvidenceChip = {
  id: string;
  label: string;
  windowStartISO?: string;
  windowEndISO?: string;
  count?: number;
  source?: 'reflections' | 'events' | 'external';
};

/**
 * Canonical insight pattern model
 * All patterns across Weekly, Yearly, Lifetime map to this structure
 */
export type InsightPattern = {
  id: string;
  kind: InsightPatternKind;
  label: string;
  strength?: number; // 0–1 optional
  evidence?: InsightEvidenceChip[];
  contrastingPairId?: string;
};

/**
 * Set of patterns computed for a given window
 */
export type InsightPatternSet = {
  patterns: InsightPattern[];
  updatedAtISO: string;
};

/**
 * Generate deterministic pattern ID from kind and label
 * Format: `${kind}:${slug(label)}`
 */
export function makePatternId(kind: InsightPatternKind, label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  return `${kind}:${slug}`;
}

