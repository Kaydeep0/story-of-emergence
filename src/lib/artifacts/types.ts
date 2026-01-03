/**
 * Share Artifact Contract
 * 
 * Canonical type definition for shareable artifacts.
 * Used across all artifact generators and sharing components.
 * 
 * Based on the contract in src/lib/lifetimeArtifact.ts but extended for all artifact types.
 */

export type ShareArtifact = {
  kind: 'lifetime' | 'weekly' | 'yearly' | 'summary' | 'timeline';
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
  
  // Optional fields for different artifact types
  title?: string;
  subtitle?: string;
  reflections?: Array<{ id: string; createdAt: string; plaintextPreview?: string }>;
};

