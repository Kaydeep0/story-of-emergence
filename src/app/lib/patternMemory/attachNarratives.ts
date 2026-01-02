// src/app/lib/patternMemory/attachNarratives.ts
// Narrative attachment layer
// Phase 5.4: Attach generated narratives to insight artifacts

import type { InsightArtifact } from '../insights/artifactTypes';
import type { PatternNarrative } from './patternNarratives';

/**
 * Attach pattern narratives to an insight artifact
 * 
 * This is a pure mapping function that adds narratives to artifacts
 * without mutating the input. This allows the engine to carry meaning
 * without rendering it yet.
 * 
 * Phase 5.4: Pure mapping only - no UI, no storage, no compute changes.
 * 
 * @param artifact - The insight artifact to attach narratives to
 * @param narratives - Array of pattern narratives to attach
 * @returns New artifact with narratives attached (or unchanged if narratives empty)
 * 
 * @example
 * // Self-test example:
 * // Input artifact:
 * const artifact: InsightArtifact = {
 *   id: 'weekly-2025-01-01-2025-01-08',
 *   horizon: 'weekly',
 *   window: { startISO: '2025-01-01T00:00:00Z', endISO: '2025-01-08T00:00:00Z' },
 *   createdAtISO: '2025-01-08T12:00:00Z',
 *   cards: [],
 *   meta: { version: 1 },
 * };
 * 
 * // Input narratives:
 * const narratives: PatternNarrative[] = [
 *   {
 *     id: 'work:topic=meetings',
 *     kind: 'work',
 *     deltaType: 'emergent',
 *     title: 'A new pattern is forming',
 *     body: 'This pattern appeared in the latest window and was not present before.',
 *     evidence: [{ label: 'Appeared 1 time', occurrenceCount: 1 }],
 *   },
 * ];
 * 
 * // Expected output:
 * const artifactWithNarratives = attachNarrativesToArtifact(artifact, narratives);
 * // artifactWithNarratives.narratives === narratives
 * // artifactWithNarratives.id === artifact.id (unchanged)
 * // All other fields preserved
 */
export function attachNarrativesToArtifact(
  artifact: InsightArtifact,
  narratives: PatternNarrative[]
): InsightArtifact {
  // If narratives empty, return artifact unchanged
  if (narratives.length === 0) {
    return artifact;
  }
  
  // Return new artifact with narratives attached
  // Do not mutate input, do not reorder existing fields
  return {
    ...artifact,
    narratives,
  };
}

