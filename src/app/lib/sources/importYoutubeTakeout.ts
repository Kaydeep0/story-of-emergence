// src/app/lib/sources/importYoutubeTakeout.ts
// Helper for importing YouTube Takeout JSON files

'use client';

import { YouTubeTakeoutAdapter } from './adapters/youtubeTakeoutAdapter';
import type { InternalEvent } from '../types';

export type ImportResult = {
  events: InternalEvent[];
  stats: {
    total: number;
    watchCount: number;
    likeCount: number;
    dateRange: {
      earliest: Date | null;
      latest: Date | null;
    };
  };
};

/**
 * Import YouTube Takeout JSON file
 * @param file - The JSON file from YouTube Takeout
 * @returns Normalized events and statistics
 */
export async function importYoutubeTakeout(file: File): Promise<ImportResult> {
  // Read file content
  const text = await file.text();
  
  // Parse JSON
  let rawData: unknown;
  try {
    rawData = JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Normalize using adapter
  const adapter = new YouTubeTakeoutAdapter();
  const events = adapter.normalize(rawData);

  // Calculate statistics
  const watchEvents = events.filter(e => {
    const payload = e.plaintext as Record<string, unknown>;
    if (payload.type !== 'source_event') return false;
    const raw = payload.raw;
    if (typeof raw !== 'string') return false;
    try {
      const metadata = JSON.parse(raw) as Record<string, unknown>;
      return metadata.eventType === 'watch';
    } catch {
      return false;
    }
  });

  const likeEvents = events.filter(e => {
    const payload = e.plaintext as Record<string, unknown>;
    if (payload.type !== 'source_event') return false;
    const raw = payload.raw;
    if (typeof raw !== 'string') return false;
    try {
      const metadata = JSON.parse(raw) as Record<string, unknown>;
      return metadata.eventType === 'like';
    } catch {
      return false;
    }
  });

  // Find date range
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const event of events) {
    if (!earliest || event.eventAt < earliest) {
      earliest = event.eventAt;
    }
    if (!latest || event.eventAt > latest) {
      latest = event.eventAt;
    }
  }

  return {
    events,
    stats: {
      total: events.length,
      watchCount: watchEvents.length,
      likeCount: likeEvents.length,
      dateRange: {
        earliest,
        latest,
      },
    },
  };
}

