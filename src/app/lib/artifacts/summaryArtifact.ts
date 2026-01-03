/**
 * Summary Artifact Generator (Shim)
 * 
 * Compatibility shim for Summary lens route.
 * TODO: Implement proper summary artifact generation
 */

import type { ShareArtifact } from '../../../lib/artifacts/types';
import type { ReflectionEntry } from '../insights/types';
import { generateLifetimeArtifact } from '../../../lib/artifacts/lifetimeArtifact';

/**
 * Generate a shareable artifact from Summary insights.
 * 
 * Currently uses lifetime artifact generator as a shim.
 * TODO: Implement summary-specific artifact generation
 */
export async function generateSummaryArtifact(
  reflections: ReflectionEntry[],
  wallet: string
): Promise<ShareArtifact> {
  // Shim: Use lifetime artifact generator for now
  return generateLifetimeArtifact(reflections, wallet);
}

