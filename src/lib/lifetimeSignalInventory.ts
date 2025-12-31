/**
 * LIFETIME SIGNAL INVENTORY
 *
 * This module performs structural observation only.
 *
 * It must never:
 * - Generate narrative language
 * - Assign meaning or causality
 * - Compress reflections into summaries
 * - Predict future behavior
 * - Label identity or emotional states
 *
 * All outputs must be mechanically derivable from reflection metadata.
 */

export type LifetimeSignal = {
  id: string;
  label: string;
  category: 'theme' | 'transition' | 'anchor';
  totalCount: number;
  firstSeen: string;
  lastSeen: string;
  distinctMonths: number;
  confidence: number;
  reflectionIds: string[];
};

export type LifetimeSignalInventory = {
  generatedAt: string;
  totalReflections: number;
  signals: LifetimeSignal[];
};

export type ReflectionMeta = {
  id: string;
  createdAt: string;
};

export type DeterministicCandidate = {
  id: string;
  label: string;
  category: 'theme' | 'transition' | 'anchor';
  reflectionIds: string[];
  confidence: number;
};

/**
 * Safe date parsing - returns null for invalid dates
 */
function safeDate(value: unknown): Date | null {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Normalize timestamp: prefer created_at, fallback to createdAt, exclude invalid
 */
function normalizeTimestamp(item: ReflectionMeta | { created_at?: string; createdAt?: string }): string | null {
  const date = safeDate((item as any).created_at ?? (item as any).createdAt);
  if (!date) return null;
  return date.toISOString();
}

/**
 * Helper: Get month key from ISO date string (YYYY-MM format).
 * Returns null for invalid dates.
 */
function monthKey(iso: string): string | null {
  const d = safeDate(iso);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Helper: Compute distinct months spanned by a set of dates.
 * Only counts valid dates.
 */
function computeDistinctMonths(dates: string[]): number {
  const validMonths = dates
    .map(monthKey)
    .filter((m): m is string => m !== null);
  const set = new Set(validMonths);
  return set.size;
}

/**
 * Helper: Get minimum ISO date string from valid dates only.
 */
function minIso(dates: string[]): string {
  const validDates = dates.filter(d => safeDate(d) !== null);
  if (validDates.length === 0) return '';
  return validDates.reduce((a, b) => (a < b ? a : b));
}

/**
 * Helper: Get maximum ISO date string from valid dates only.
 */
function maxIso(dates: string[]): string {
  const validDates = dates.filter(d => safeDate(d) !== null);
  if (validDates.length === 0) return '';
  return validDates.reduce((a, b) => (a > b ? a : b));
}

/**
 * Clamp confidence value between 0 and 1.
 * Defaults to 0.5 if value is invalid or cannot be computed.
 */
function clampConfidence(value: number | undefined | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, value));
}

/**
 * Build lifetime signal inventory from reflection history.
 * 
 * This function performs structural observation only:
 * - What repeats
 * - How often
 * - Over what time span
 * - Where it appears
 * 
 * No interpretation, no meaning, no summaries.
 */
export function buildLifetimeSignalInventory(args: {
  reflections: ReflectionMeta[];
  candidates: DeterministicCandidate[];
}): LifetimeSignalInventory {
  // Build reflection date lookup with normalized timestamps
  // Filter out reflections with invalid dates
  const dateById = new Map<string, string>();
  const validReflections: ReflectionMeta[] = [];
  
  for (const r of args.reflections) {
    const normalized = normalizeTimestamp(r);
    if (normalized) {
      dateById.set(r.id, normalized);
      validReflections.push(r);
    }
  }

  // Map candidates into LifetimeSignal
  const signals: LifetimeSignal[] = args.candidates
    .map((c) => {
      // Resolve reflection dates using dateById (only valid dates)
      const dates = c.reflectionIds
        .map((id) => dateById.get(id))
        .filter((x): x is string => typeof x === 'string' && safeDate(x) !== null);

      // Filter out candidates with no valid dates
      if (!dates.length) return null;

      // Ensure firstSeen and lastSeen are valid
      const firstSeen = minIso(dates);
      const lastSeen = maxIso(dates);
      if (!firstSeen || !lastSeen || !safeDate(firstSeen) || !safeDate(lastSeen)) {
        return null;
      }

      return {
        id: c.id,
        label: c.label, // Never modify the label text
        category: c.category,
        totalCount: dates.length,
        firstSeen,
        lastSeen,
        distinctMonths: computeDistinctMonths(dates),
        confidence: clampConfidence(c.confidence), // Clamp confidence between 0 and 1
        reflectionIds: c.reflectionIds.filter((id) => dateById.has(id)),
      } satisfies LifetimeSignal;
    })
    .filter((x): x is LifetimeSignal => Boolean(x));

  // Sort signals by confidence desc, distinctMonths desc, totalCount desc
  signals.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    if (b.distinctMonths !== a.distinctMonths) {
      return b.distinctMonths - a.distinctMonths;
    }
    return b.totalCount - a.totalCount;
  });

  return {
    generatedAt: new Date().toISOString(),
    totalReflections: validReflections.length, // Only count valid reflections
    signals,
  };
}

import type { ShareArtifact } from './shareArtifacts';

/**
 * Generate a shareable artifact from lifetime signal inventory.
 * 
 * Rules:
 * - Uses already sanitized data (no recomputation)
 * - No interpretation
 * - Payload is raw inventory snapshot
 * - No network calls, storage, sharing, mutation, or persistence
 * - Artifact exists only in memory
 */
export function generateLifetimeArtifact(
  inventory: LifetimeSignalInventory
): ShareArtifact {
  return {
    id: `lifetime-${inventory.generatedAt}`,
    source: 'lifetime',
    title: 'Lifetime Signal Inventory',
    subtitle: `Generated from ${inventory.totalReflections} reflections`,
    generatedAt: new Date().toISOString(),
    payload: inventory, // Raw inventory snapshot
  };
}

