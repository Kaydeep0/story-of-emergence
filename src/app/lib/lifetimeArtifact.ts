/**
 * Lifetime Artifact Type Re-export (Shim)
 * 
 * Compatibility shim for routes expecting ShareArtifact at this path.
 * Re-exports from canonical location.
 */

export type { ShareArtifact } from '../../lib/artifacts/types';
export type LifetimeArtifact = ShareArtifact;
