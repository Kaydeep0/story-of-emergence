// src/app/lib/sources/adapters/youtubeTakeoutAdapter.ts
// YouTube Takeout Adapter for parsing watch history and likes

import type { SourceAdapter } from '../sourceAdapter';
import type { InternalEvent } from '../../types';

/**
 * YouTube Takeout JSON structure types
 */
type YouTubeWatchHistoryEntry = {
  title: string;
  titleUrl?: string;
  time: string; // ISO timestamp
  subtitles?: Array<{
    name: string;
    url?: string;
  }>;
  header?: string;
  description?: string;
  products?: string[];
};

type YouTubeLikesEntry = {
  title: string;
  titleUrl?: string;
  time: string; // ISO timestamp
  channelName?: string;
  channelUrl?: string;
};

type YouTubeTakeoutData = {
  'watch-history.json'?: YouTubeWatchHistoryEntry[];
  'likes.json'?: YouTubeLikesEntry[];
  [key: string]: unknown; // Allow other files to be present but ignored
};

/**
 * Adapter for YouTube Takeout JSON exports
 * Supports watch-history.json and likes.json
 */
export class YouTubeTakeoutAdapter implements SourceAdapter {
  sourceKind = 'youtube' as const;
  
  importCapabilities = {
    history: true,
    likes: true,
    saves: false,
    comments: false,
  };

  /**
   * Normalize YouTube Takeout data into InternalEvent[] format
   * @param raw - Raw YouTube Takeout data (object with file keys, or array for single file)
   * @returns Array of InternalEvent objects
   */
  normalize(raw: unknown): InternalEvent[] {
    const events: InternalEvent[] = [];
    
    if (!raw || typeof raw !== 'object') {
      console.warn('[YouTubeTakeoutAdapter] Invalid raw data: expected object or array');
      return events;
    }

    // Handle case where user uploads a single file (array of entries)
    if (Array.isArray(raw)) {
      // Try to detect type by checking first entry structure
      const firstEntry = raw[0];
      if (firstEntry && typeof firstEntry === 'object') {
        // Check if it looks like watch history (has subtitles)
        if ('subtitles' in firstEntry) {
          const watchEvents = this.normalizeWatchHistory(raw as YouTubeWatchHistoryEntry[]);
          events.push(...watchEvents);
        }
        // Check if it looks like likes (has channelName or channelUrl)
        else if ('channelName' in firstEntry || 'channelUrl' in firstEntry) {
          const likeEvents = this.normalizeLikes(raw as YouTubeLikesEntry[]);
          events.push(...likeEvents);
        }
        // Default to watch history if structure is ambiguous
        else {
          const watchEvents = this.normalizeWatchHistory(raw as YouTubeWatchHistoryEntry[]);
          events.push(...watchEvents);
        }
      }
      return events;
    }

    // Handle case where user uploads combined export (object with file keys)
    const data = raw as YouTubeTakeoutData;

    // Process watch history
    if (data['watch-history.json'] && Array.isArray(data['watch-history.json'])) {
      const watchEvents = this.normalizeWatchHistory(data['watch-history.json']);
      events.push(...watchEvents);
    }

    // Process likes
    if (data['likes.json'] && Array.isArray(data['likes.json'])) {
      const likeEvents = this.normalizeLikes(data['likes.json']);
      events.push(...likeEvents);
    }

    // Stub for other file types (future support)
    // Other files in the takeout are ignored for now

    return events;
  }

  /**
   * Normalize watch history entries
   */
  private normalizeWatchHistory(entries: YouTubeWatchHistoryEntry[]): InternalEvent[] {
    const events: InternalEvent[] = [];

    for (const entry of entries) {
      try {
        const eventAt = new Date(entry.time);
        if (isNaN(eventAt.getTime())) {
          console.warn('[YouTubeTakeoutAdapter] Invalid timestamp:', entry.time);
          continue;
        }

        // Extract channel name from subtitles array
        const channel = entry.subtitles?.[0]?.name || 'Unknown Channel';
        const channelUrl = entry.subtitles?.[0]?.url || null;

        // Build metadata blob (includes eventType)
        const metadata = {
          eventType: 'watch',
          channel,
          channelUrl,
          description: entry.description || null,
          products: entry.products || [],
          header: entry.header || null,
        };

        // Create InternalEvent payload
        const payload = {
          type: 'source_event' as const,
          source_id: 'youtube-takeout', // Will be replaced with actual source ID on import
          source_kind: 'youtube' as const,
          title: entry.title || 'Untitled Video',
          url: entry.titleUrl || null,
          raw: JSON.stringify(metadata),
        };

        // Create InternalEvent (with temporary ID - will be replaced on insert)
        const event: InternalEvent = {
          id: crypto.randomUUID(), // Temporary ID
          eventAt,
          createdAt: new Date(), // Temporary timestamp
          plaintext: payload,
        };

        events.push(event);
      } catch (error) {
        console.warn('[YouTubeTakeoutAdapter] Error processing watch entry:', error, entry);
      }
    }

    return events;
  }

  /**
   * Normalize likes entries
   */
  private normalizeLikes(entries: YouTubeLikesEntry[]): InternalEvent[] {
    const events: InternalEvent[] = [];

    for (const entry of entries) {
      try {
        const eventAt = new Date(entry.time);
        if (isNaN(eventAt.getTime())) {
          console.warn('[YouTubeTakeoutAdapter] Invalid timestamp:', entry.time);
          continue;
        }

        const channel = entry.channelName || 'Unknown Channel';
        const channelUrl = entry.channelUrl || null;

        // Build metadata blob (includes eventType)
        const metadata = {
          eventType: 'like',
          channel,
          channelUrl,
        };

        // Create InternalEvent payload
        const payload = {
          type: 'source_event' as const,
          source_id: 'youtube-takeout', // Will be replaced with actual source ID on import
          source_kind: 'youtube' as const,
          title: entry.title || 'Untitled Video',
          url: entry.titleUrl || null,
          raw: JSON.stringify(metadata),
        };

        // Create InternalEvent (with temporary ID - will be replaced on insert)
        const event: InternalEvent = {
          id: crypto.randomUUID(), // Temporary ID
          eventAt,
          createdAt: new Date(), // Temporary timestamp
          plaintext: payload,
        };

        events.push(event);
      } catch (error) {
        console.warn('[YouTubeTakeoutAdapter] Error processing like entry:', error, entry);
      }
    }

    return events;
  }
}

