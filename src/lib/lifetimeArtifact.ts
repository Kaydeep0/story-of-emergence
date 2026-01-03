/**
 * Share Artifact Contract
 * 
 * Frozen contract for shareable artifacts (Lifetime, Weekly, Yearly).
 * 
 * This is a strict contract. No optional fields unless strictly necessary.
 * All fields must be present. Missing values must be null, not undefined.
 * 
 * This contract is locked and must not change without explicit versioning.
 */

export type ShareArtifact = {
  kind: 'lifetime' | 'weekly' | 'yearly';
  generatedAt: string; // ISO
  wallet: string;
  artifactId: string; // Deterministic SHA-256 hash

  inventory: {
    totalReflections: number;
    firstReflectionDate: string | null;
    lastReflectionDate: string | null;
    distinctMonths: number;
  };

  signals: Array<{
    id: string;
    label: string;
    confidence: number; // 0–1
    evidenceCount: number;
  }>;
};

// Legacy type alias for backward compatibility
export type LifetimeArtifact = ShareArtifact;

