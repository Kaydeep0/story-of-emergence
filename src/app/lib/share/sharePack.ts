import type { NarrativeDelta } from '@/app/lib/distributions/deltas';

/**
 * Moment represents a key insight moment in the Share Pack
 * Simplified from InsightCard for portability
 */
export type Moment = {
  headline: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
};

/**
 * Share Pack - Self-contained, deterministic, signed yearly wrap
 * Read-only structure, no wallet references in content
 */
export type SharePack = {
  id: string;
  createdAt: number;
  scope: 'year';
  title: string;
  summary: string;
  moments: Moment[];
  shifts: NarrativeDelta[];
  density: string;
  cadence: string;
  confidence: 'high' | 'medium' | 'low';
  checksum: string;
};

