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
 * Helper: Get month key from ISO date string (YYYY-MM format).
 */
function monthKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Helper: Compute distinct months spanned by a set of dates.
 */
function computeDistinctMonths(dates: string[]): number {
  const set = new Set(dates.map(monthKey));
  return set.size;
}

/**
 * Helper: Get minimum ISO date string.
 */
function minIso(dates: string[]): string {
  if (dates.length === 0) return '';
  return dates.reduce((a, b) => (a < b ? a : b));
}

/**
 * Helper: Get maximum ISO date string.
 */
function maxIso(dates: string[]): string {
  if (dates.length === 0) return '';
  return dates.reduce((a, b) => (a > b ? a : b));
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
  // Build reflection date lookup
  const dateById = new Map<string, string>();
  for (const r of args.reflections) {
    dateById.set(r.id, r.createdAt);
  }

  // Map candidates into LifetimeSignal
  const signals: LifetimeSignal[] = args.candidates
    .map((c) => {
      // Resolve reflection dates using dateById
      const dates = c.reflectionIds
        .map((id) => dateById.get(id))
        .filter((x): x is string => typeof x === 'string');

      // Filter out candidates with no valid dates
      if (!dates.length) return null;

      return {
        id: c.id,
        label: c.label, // Never modify the label text
        category: c.category,
        totalCount: dates.length,
        firstSeen: minIso(dates),
        lastSeen: maxIso(dates),
        distinctMonths: computeDistinctMonths(dates),
        confidence: c.confidence, // Confidence comes from candidate untouched
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
    totalReflections: args.reflections.length,
    signals,
  };
}

