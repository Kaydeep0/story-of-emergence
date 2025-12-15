// src/app/lib/sources/sourceAdapter.ts
// Source Adapter Interface for large-scale ingestion

import type { InternalEvent } from '../types';

/**
 * Base interface for source adapters that normalize external data
 * into InternalEvent[] format for ingestion into the system.
 */
export interface SourceAdapter {
  /**
   * The kind of source this adapter handles
   */
  sourceKind: 'youtube' | 'article' | 'book' | 'podcast' | 'social';

  /**
   * Capabilities this adapter supports for importing data
   */
  importCapabilities: {
    history?: boolean;
    likes?: boolean;
    saves?: boolean;
    comments?: boolean;
  };

  /**
   * Normalize raw external data into InternalEvent[] format
   * @param raw - Raw data from the external source (format varies by source)
   * @returns Array of InternalEvent objects ready for ingestion
   */
  normalize(raw: unknown): InternalEvent[];
}

