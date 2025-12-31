/**
 * Narrative Trace Metadata
 * 
 * Derived metadata about the source reflections for a narrative candidate.
 * This is computed live, never stored as truth.
 */

export interface NarrativeTrace {
  reflectionIds: string[];
  firstSeen: string; // ISO date string
  lastSeen: string; // ISO date string
  count: number;
}

/**
 * Compute trace metadata from reflection IDs and their dates.
 * 
 * @param reflectionIds - Array of reflection IDs
 * @param reflectionDates - Map of reflection ID to created_at date
 * @returns NarrativeTrace with computed metadata
 */
export function computeNarrativeTrace(
  reflectionIds: string[],
  reflectionDates: Map<string, string>
): NarrativeTrace {
  if (reflectionIds.length === 0) {
    return {
      reflectionIds: [],
      firstSeen: '',
      lastSeen: '',
      count: 0,
    };
  }

  const dates = reflectionIds
    .map(id => reflectionDates.get(id))
    .filter((d): d is string => !!d)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return {
    reflectionIds,
    firstSeen: dates[0] || '',
    lastSeen: dates[dates.length - 1] || '',
    count: reflectionIds.length,
  };
}

/**
 * Format date for trace display (e.g., "Mar 2024").
 */
export function formatTraceDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

