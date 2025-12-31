/**
 * Lifetime Artifact Contract
 * 
 * Frozen contract for Lifetime shareable artifacts.
 * 
 * This is a strict contract. No optional fields unless strictly necessary.
 * All fields must be present. Missing values must be null, not undefined.
 * 
 * This contract is locked and must not change without explicit versioning.
 */

export type LifetimeArtifact = {
  kind: 'lifetime';
  generatedAt: string; // ISO
  wallet: string;

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

