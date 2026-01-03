/**
 * Share Artifact Contract
 * 
 * Frozen contract for shareable artifacts (Lifetime, Weekly, Yearly).
 * 
 * This is a strict contract. No optional fields unless strictly necessary.
 * All fields must be present. Missing values must be null, not undefined.
 * 
 * This contract is locked and must not change without explicit versioning.
 * 
 * NOTE: ShareArtifact type is now defined in @/lib/artifacts/types.ts
 * This file re-exports it for backward compatibility.
 */

export type { ShareArtifact } from '@/lib/artifacts/types';

// Legacy type alias for backward compatibility
export type LifetimeArtifact = ShareArtifact;

