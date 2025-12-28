import type { ReflectionEntry } from '@/app/lib/insights/types';

export type WeightedEvent = {
  ts: number;
  weight: number;
};

/**
 * Convert reflections to weighted timestamp events for the distribution engine
 * @param reflections Array of decrypted reflection entries
 * @returns Array of weighted events with timestamps and weights
 */
export function reflectionsToWeightedEvents(reflections: ReflectionEntry[]): WeightedEvent[] {
  const events: WeightedEvent[] = [];

  for (const reflection of reflections) {
    // Skip deleted reflections
    if (reflection.deletedAt) {
      continue;
    }

    // Extract timestamp from createdAt (ISO string)
    let ts: number;
    try {
      const date = new Date(reflection.createdAt);
      ts = date.getTime();
      
      // Filter out invalid timestamps
      if (!Number.isFinite(ts) || ts <= 0) {
        continue;
      }
    } catch {
      // Invalid date string, skip this reflection
      continue;
    }

    // Default weight is 1
    const weight = 1;

    events.push({
      ts,
      weight,
    });
  }

  return events;
}

