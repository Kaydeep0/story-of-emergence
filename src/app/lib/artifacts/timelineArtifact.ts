/**
 * Timeline Artifact Generator (Shim)
 * 
 * Compatibility shim for Timeline lens route.
 * TODO: Implement proper timeline artifact generation
 */

import type { ShareArtifact } from '../../../lib/lifetimeArtifact';
import type { ReflectionEntry } from '../insights/types';
import { generateLifetimeArtifact } from '../../../lib/artifacts/lifetimeArtifact';

/**
 * Generate a shareable artifact from Timeline insights.
 * 
 * Currently uses lifetime artifact generator as a shim.
 * TODO: Implement timeline-specific artifact generation
 */
export async function generateTimelineArtifact(
  reflections: ReflectionEntry[],
  wallet: string
): Promise<ShareArtifact> {
  // Shim: Use lifetime artifact generator for now
  return generateLifetimeArtifact(reflections, wallet);
}

